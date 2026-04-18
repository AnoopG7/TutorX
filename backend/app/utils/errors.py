class CBSEStudyAgentException(Exception):
    """Base exception for CBSE Study Agent"""
    pass


class AuthenticationError(CBSEStudyAgentException):
    """Raised when authentication fails"""
    pass


class QuestionProcessingError(CBSEStudyAgentException):
    """Raised when question processing fails"""
    pass


class VectorSearchError(CBSEStudyAgentException):
    """Raised when vector search fails"""
    pass
