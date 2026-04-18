from groq import Groq
from app.config import get_settings
import logging
import json

logger = logging.getLogger(__name__)


class GroqService:
    """Wrapper for Groq API (LLM and embeddings)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GroqService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'client'):
            settings = get_settings()
            self.client = Groq(api_key=settings.groq_api_key)
            logger.info("Groq client initialized")
    
    def generate_answer(self, question: str, context: str, model: str = "mixtral-8x7b-32768") -> str:
        """Generate RAG-powered answer using Groq LLM"""
        try:
            system_prompt = """You are an expert CBSE tutor. Answer the student's question using the provided textbook context.
Be clear, concise, and educational. Explain concepts thoroughly but avoid overwhelming the student.
If the context doesn't contain relevant information, indicate that clearly."""
            
            user_message = f"""Context from textbook:
{context}

Student Question:
{question}

Please provide a comprehensive answer:"""
            
            message = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=1024,
                stream=False
            )
            
            return message.choices[0].message.content
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return "I encountered an error processing your question. Please try again."
    
    def generate_quiz_question(self, chapter: str, topic: str) -> dict:
        """Generate a quiz question for a given chapter/topic"""
        try:
            prompt = f"""Generate a CBSE-level multiple choice question about {topic} from {chapter}.
Format your response as JSON with keys: question, options (array of 4), correct_answer (index 0-3), explanation"""
            
            message = self.client.chat.completions.create(
                model="mixtral-8x7b-32768",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=512
            )
            
            response_text = message.choices[0].message.content
            # Extract JSON from response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(response_text[json_start:json_end])
            return {"error": "Could not parse response"}
        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            return {"error": str(e)}
    
    def get_embedding(self, text: str) -> list:
        """Get embedding for text (placeholder - implement with actual embedding service)"""
        try:
            # TODO: Implement actual embedding generation with Groq or external service
            logger.info(f"Generating embedding for: {text[:50]}...")
            # For now, return placeholder
            return [0.1] * 1536  # 1536-dimensional vector
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []


def get_groq_service():
    """Get Groq service singleton"""
    return GroqService()
