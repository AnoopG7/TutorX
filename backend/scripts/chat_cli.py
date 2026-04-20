#!/usr/bin/env python3
"""
Simple CLI Chat Interface for CBSE Study Agent
Test the RAG system directly from terminal
"""

import asyncio
import httpx
import json
import os
from typing import Optional
from dotenv import load_dotenv
from datetime import datetime

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
CHAT_ENDPOINT = f"{BACKEND_URL}/api/chat"

# Subject options
SUBJECTS = {
    "1": "Science",
    "2": "Mathematics", 
    "3": "English",
    "4": "Social Science",
    "5": "Hindi",
}

# Teaching styles
TEACHING_STYLES = {
    "1": "definition_first",
    "2": "analogy_first",
    "3": "example_first",
    "4": "socratic",
}

# Grade options (fixed at 9 for now)
GRADE = 9

def print_banner():
    """Print welcome banner"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}")
    print("╔════════════════════════════════════════╗")
    print("║  🎓 CBSE Study Agent - Chat Interface  ║")
    print("║     Powered by RAG + Query Expansion   ║")
    print("╚════════════════════════════════════════╝")
    print(f"{Colors.ENDC}\n")

def print_subjects():
    """Display available subjects"""
    print(f"{Colors.CYAN}{Colors.BOLD}📚 Available Subjects:{Colors.ENDC}")
    for key, subject in SUBJECTS.items():
        print(f"   {key}. {subject}")
    print()

def print_teaching_styles():
    """Display available teaching styles"""
    print(f"{Colors.CYAN}{Colors.BOLD}🎯 Teaching Styles:{Colors.ENDC}")
    print(f"   1. Definition-First (Concept → Principle → Example) ⭐ Recommended")
    print(f"   2. Analogy-First (Relatable everyday example first)")
    print(f"   3. Example-First (Real-world example → concept)")
    print(f"   4. Socratic (Guiding questions to help you think)")
    print()

def get_subject_choice() -> Optional[str]:
    """Get subject choice from user"""
    while True:
        print_subjects()
        choice = input(f"{Colors.YELLOW}Select subject (1-5) [default: 1]: {Colors.ENDC}").strip()
        
        if not choice:
            choice = "1"
        
        if choice in SUBJECTS:
            subject = SUBJECTS[choice]
            print(f"{Colors.GREEN}✓ Selected: {subject}{Colors.ENDC}\n")
            return subject
        else:
            print(f"{Colors.RED}✗ Invalid choice. Please select 1-5.{Colors.ENDC}\n")

def get_teaching_style_choice() -> str:
    """Get teaching style preference from user"""
    while True:
        print_teaching_styles()
        choice = input(f"{Colors.YELLOW}Select teaching style (1-4) [default: 1]: {Colors.ENDC}").strip()
        
        if not choice:
            choice = "1"
        
        if choice in TEACHING_STYLES:
            style_name = {
                "1": "Definition-First",
                "2": "Analogy-First",
                "3": "Example-First",
                "4": "Socratic"
            }.get(choice, "Definition-First")
            print(f"{Colors.GREEN}✓ Selected: {style_name}{Colors.ENDC}\n")
            return TEACHING_STYLES[choice]
        else:
            print(f"{Colors.RED}✗ Invalid choice. Please select 1-4.{Colors.ENDC}\n")

async def send_query(query: str, subject: str) -> Optional[dict]:
    """Send query to backend and get response"""
    try:
        payload = {
            "message": query,
            "subject": subject,
            "grade": GRADE,
            "user_id": "cli_test_user",
        }
        
        print(f"{Colors.YELLOW}⏳ Processing query...{Colors.ENDC}\n")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(CHAT_ENDPOINT, json=payload)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"{Colors.RED}✗ Error: {response.status_code} - {response.text}{Colors.ENDC}\n")
                return None
                
    except httpx.ConnectError:
        print(f"{Colors.RED}✗ Error: Cannot connect to backend at {BACKEND_URL}{Colors.ENDC}")
        print(f"  Make sure the backend is running: python -m app.main{Colors.ENDC}\n")
        return None
    except Exception as e:
        print(f"{Colors.RED}✗ Error: {str(e)}{Colors.ENDC}\n")
        return None

def print_response(data: dict):
    """Pretty print the response"""
    print(f"{Colors.GREEN}{Colors.BOLD}✓ Response:{Colors.ENDC}\n")
    
    # Main response
    if "response" in data:
        print(f"{Colors.BLUE}{data['response']}{Colors.ENDC}\n")
    
    
    # Performance metrics (if available)
    if "metrics" in data:
        metrics = data["metrics"]
        print(f"{Colors.CYAN}{Colors.BOLD}⏱️  Performance:{Colors.ENDC}")
        print(f"   Total latency: {metrics.get('total_time_ms', 'N/A'):.0f}ms")
        print(f"   Chunks retrieved: {metrics.get('chunks_retrieved', 'N/A')}")
        print(f"   Avg similarity: {metrics.get('avg_similarity_score', 'N/A'):.3f}")
        print(f"   Cache hit: {metrics.get('cache_hit', False)}\n")

def print_help():
    """Print help information"""
    print(f"\n{Colors.CYAN}{Colors.BOLD}💡 Commands:{Colors.ENDC}")
    print("   Type your question and press Enter")
    print("   'subject'      - Change subject")
    print("   'style'        - Change teaching style")
    print("   'help'         - Show this help")
    print("   'quit'         - Exit chat\n")

async def main():
    """Main chat loop"""
    print_banner()
    print_help()
    
    subject = get_subject_choice()
    teaching_style = get_teaching_style_choice()
    query_count = 0
    
    print(f"{Colors.BOLD}{Colors.CYAN}📝 Current Settings:{Colors.ENDC}")
    print(f"   Subject: {subject}")
    print(f"   Teaching Style: {teaching_style}")
    print(f"   Grade: 9\n")
    
    while True:
        try:
            query = input(f"{Colors.BOLD}You [{subject}]:{Colors.ENDC} ").strip()
            
            if not query:
                continue
            
            # Handle commands
            if query.lower() == "quit":
                print(f"\n{Colors.GREEN}👋 Goodbye! Chat {query_count} queries.{Colors.ENDC}\n")
                break
            elif query.lower() == "help":
                print_help()
                continue
            elif query.lower() == "subject":
                subject = get_subject_choice()
                print(f"{Colors.CYAN}Subject changed to: {subject}{Colors.ENDC}\n")
                continue
            elif query.lower() == "style":
                teaching_style = get_teaching_style_choice()
                print(f"{Colors.CYAN}Note: Teaching style will apply to future responses{Colors.ENDC}\n")
                continue
            
            # Send query
            response = await send_query(query, subject)
            
            if response:
                query_count += 1
                print_response(response)
            
            # Print divider
            print(f"{Colors.ENDC}{'-' * 80}\n")
            
        except KeyboardInterrupt:
            print(f"\n\n{Colors.GREEN}👋 Chat interrupted. Goodbye!{Colors.ENDC}\n")
            break
        except Exception as e:
            print(f"{Colors.RED}✗ Error: {str(e)}{Colors.ENDC}\n")

if __name__ == "__main__":
    asyncio.run(main())
