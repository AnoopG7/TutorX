from supabase import create_client
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)


class SupabaseService:
    """Wrapper for Supabase client and operations"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'client'):
            settings = get_settings()
            self.client = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
            logger.info("Supabase client initialized")
    
    def get_user(self, user_id: str):
        """Get user profile"""
        try:
            response = self.client.table("student_profiles").select("*").eq("user_id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None
    
    def save_question(self, user_id: str, question: str, response: str, chapter: str):
        """Save user question and AI response"""
        try:
            data = {
                "user_id": user_id,
                "question": question,
                "response": response,
                "chapter": chapter
            }
            self.client.table("user_questions").insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving question: {e}")
            return False
    
    def search_textbook_chunks(self, query_embedding: list, limit: int = 5):
        """Search textbook chunks using pgvector"""
        try:
            response = self.client.rpc(
                "search_textbook_chunks",
                {"query_embedding": query_embedding, "match_count": limit}
            ).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error searching chunks: {e}")
            return []


def get_supabase_service():
    """Get Supabase service singleton"""
    return SupabaseService()
