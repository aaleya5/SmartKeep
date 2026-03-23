"""
Readability calculation utilities.

This module provides functions for calculating:
1. Reading time based on word count (words / 200 = minutes)
2. Flesch-Kincaid readability score
3. Difficulty classification (Easy/Intermediate/Advanced)
"""

import re
import math
from typing import Tuple


def count_syllables(word: str) -> int:
    """
    Count the number of syllables in a word.
    
    Uses a heuristic approach based on vowel patterns.
    """
    word = word.lower().strip()
    if not word:
        return 0
    
    # Count vowel groups
    vowels = "aeiouy"
    syllable_count = 0
    previous_was_vowel = False
    
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not previous_was_vowel:
            syllable_count += 1
        previous_was_vowel = is_vowel
    
    # Handle silent 'e' at end
    if word.endswith('e') and syllable_count > 1:
        syllable_count -= 1
    
    # Ensure at least 1 syllable
    return max(1, syllable_count)


def calculate_reading_time(text: str) -> float:
    """
    Calculate estimated reading time in minutes.
    
    Based on average adult reading speed of 200 words per minute.
    
    Args:
        text: The content to analyze
        
    Returns:
        Estimated reading time in minutes (rounded to 1 decimal)
    """
    if not text or not text.strip():
        return 0.0
    
    # Count words (split on whitespace)
    words = text.split()
    word_count = len(words)
    
    # Calculate reading time (200 wpm average)
    reading_time = word_count / 200.0
    
    return round(reading_time, 1)


def calculate_flesch_kincaid(text: str) -> float:
    """
    Calculate Flesch-Kincaid Grade Level score.
    
    The formula is:
    0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
    
    Higher scores indicate more difficult text.
    Typical ranges:
    - 90-100: Very Easy (5th grade)
    - 60-70: Standard (8th-9th grade)  
    - 0-30: Very Difficult (College graduate)
    
    Args:
        text: The content to analyze
        
    Returns:
        Flesch-Kincaid grade level score
    """
    if not text or not text.strip():
        return 0.0
    
    # Clean the text
    text = text.strip()
    
    # Count sentences (split on .!?)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    total_sentences = max(1, len(sentences))
    
    # Count words
    words = text.split()
    total_words = max(1, len(words))
    
    # Count syllables
    total_syllables = sum(count_syllables(word) for word in words)
    total_syllables = max(1, total_syllables)
    
    # Calculate Flesch-Kincaid Grade Level
    fk_score = (
        0.39 * (total_words / total_sentences) +
        11.8 * (total_syllables / total_words) -
        15.59
    )
    
    # Clamp to reasonable range
    return max(0.0, min(100.0, round(fk_score, 2)))


def get_difficulty_level(fk_score: float) -> str:
    """
    Classify difficulty level based on Flesch-Kincaid score.
    
    Args:
        fk_score: Flesch-Kincaid grade level score
        
    Returns:
        Difficulty classification: 'Easy', 'Intermediate', or 'Advanced'
    """
    if fk_score >= 60:
        return 'Easy'
    elif fk_score >= 30:
        return 'Intermediate'
    else:
        return 'Advanced'


def analyze_readability(text: str) -> dict:
    """
    Complete readability analysis for a text.
    
    Args:
        text: The content to analyze
        
    Returns:
        Dictionary with reading_time, difficulty_score, and difficulty_level
    """
    reading_time = calculate_reading_time(text)
    difficulty_score = calculate_flesch_kincaid(text)
    difficulty_level = get_difficulty_level(difficulty_score)
    
    return {
        'reading_time': reading_time,
        'difficulty_score': difficulty_score,
        'difficulty_level': difficulty_level
    }
