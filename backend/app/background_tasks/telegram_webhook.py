"""
Telegram Bot Webhook Handler
============================
Receives messages from Telegram and processes them through the agent.
"""

import logging
from typing import Optional
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

from app.agent.loop import run_agent
from app.agent.memory import get_or_create_session
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Simple in-memory user state (for production, use a database)
user_sessions: dict[int, dict] = {}


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command - welcome message and grade selection."""
    chat_id = update.effective_chat.id
    user = update.effective_user

    welcome_text = """👋 Welcome to TutorX! Your CBSE Study Agent

I'm here to help you study and understand CBSE concepts.

To get started, please tell me:
1. Your grade (9 or 10)
2. Your name

Example: "I'm Priya, Grade 10"
"""
    await context.bot.send_message(chat_id=chat_id, text=welcome_text)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    help_text = """📚 TutorX Commands:

/start   - Start a new session
/help    - Show this help
/ask     - Ask a question directly
/chapter - Select chapter to study

You can also just type your question directly!
Example: "Explain photosynthesis" or "Give me a quiz on chemical reactions"
"""
    await context.bot.send_message(chat_id=update.effective_chat.id, text=help_text)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages."""
    chat_id = update.effective_chat.id
    user_message = update.message.text
    user = update.effective_user

    # Show typing indicator
    await context.bot.send_chat_action(chat_id=chat_id, action="typing")

    # Check if user is setting up profile
    if "grade" in user_message.lower() and any(g in user_message for g in ["9", "10"]):
        # Extract grade and name
        grade = 10 if "10" in user_message else 9
        name = user.first_name or "Student"

        user_sessions[chat_id] = {
            "user_id": f"telegram_{chat_id}",
            "name": name,
            "grade": grade,
            "subject": "Science",
        }

        await context.bot.send_message(
            chat_id=chat_id,
            text=f"✅ Got it, {name}! You're Grade {grade}.\n\n"
            f"Now just ask me anything about your CBSE studies!\n"
            f"Example: 'Explain photosynthesis' or 'Quiz me on Chapter 1'",
        )
        return

    # Check if user has set up profile
    if chat_id not in user_sessions:
        await context.bot.send_message(
            chat_id=chat_id,
            text="Please start with /start to set up your profile first!",
        )
        return

    # Get user context
    user_data = user_sessions[chat_id]
    user_id = user_data.get("user_id", f"telegram_{chat_id}")
    subject = user_data.get("subject", "Science")

    try:
        # Run the agent
        result = await run_agent(
            user_id=user_id,
            message=user_message,
            subject=subject,
        )

        response = result.get("response", "I couldn't process that. Try again!")
        citations = result.get("citations", [])

        # Build response with citations
        response_text = response
        if citations:
            response_text += "\n\n📖 *Sources:*\n" + "\n".join(
                [f"• {c}" for c in citations[:3]]
            )

        await context.bot.send_message(
            chat_id=chat_id, text=response_text, parse_mode="Markdown"
        )

    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await context.bot.send_message(
            chat_id=chat_id, text="Sorry, I encountered an error. Please try again!"
        )


async def set_webhook(application: Application):
    """Setup webhook for Telegram."""
    if settings.telegram_token and settings.telegram_webhook_url:
        await application.bot.set_webhook(settings.telegram_webhook_url)
        logger.info(f"Telegram webhook set to: {settings.telegram_webhook_url}")


def create_telegram_app() -> Application:
    """Create and configure the Telegram bot application."""
    if not settings.telegram_token:
        logger.warning("TELEGRAM_TOKEN not set - Telegram bot disabled")
        return None

    application = Application.builder().token(settings.telegram_token).build()

    # Add handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )

    return application


async def process_webhook_update(update: Update):
    """Process a webhook update (for FastAPI integration)."""
    # This can be called directly from FastAPI webhook endpoint
    pass  # Implementation depends on chosen approach
