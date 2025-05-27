import React, { createContext, useState, useContext, useEffect } from 'react';
import { eventEmitter } from '../WebSocket/ws';

const SuggestionsContext = createContext();

const SUGGESTIONS_STORAGE_KEY = 'smartschool_suggestions';
const NEW_COUNT_STORAGE_KEY = 'smartschool_new_suggestions_count';

export const SuggestionsProvider = ({ children }) => {
  // Initialize from localStorage if available
  const [suggestions, setSuggestions] = useState(() => {
    try {
      const stored = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading suggestions from localStorage:', error);
      return [];
    }
  });
  
  const [newSuggestionsCount, setNewSuggestionsCount] = useState(() => {
    try {
      const stored = localStorage.getItem(NEW_COUNT_STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error loading new suggestions count from localStorage:', error);
      return 0;
    }
  });

  // Persist suggestions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(suggestions));
    } catch (error) {
      console.error('Error saving suggestions to localStorage:', error);
    }
  }, [suggestions]);

  // Persist new suggestions count to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(NEW_COUNT_STORAGE_KEY, newSuggestionsCount.toString());
    } catch (error) {
      console.error('Error saving new suggestions count to localStorage:', error);
    }
  }, [newSuggestionsCount]);

  // Synchronize newSuggestionsCount with actual suggestions array length
  useEffect(() => {
    // If the count is higher than the actual number of suggestions, reset it
    if (newSuggestionsCount > suggestions.length) {
      console.log(`Synchronizing newSuggestionsCount: ${newSuggestionsCount} -> ${suggestions.length}`);
      setNewSuggestionsCount(suggestions.length);
    }
  }, [suggestions.length, newSuggestionsCount]);

  useEffect(() => {
    const handleRecommendationUpdate = (recommendations) => {
      console.log("Global suggestions update received:", recommendations);
      if (Array.isArray(recommendations)) {
        setSuggestions(prev => {
          // Merge new recommendations with existing ones, avoiding duplicates
          const existingIds = new Set(prev.map(s => s.id));
          const newRecommendations = recommendations.filter(r => !existingIds.has(r.id));
          
          if (newRecommendations.length > 0) {
            console.log('Adding new recommendations:', newRecommendations);
            setNewSuggestionsCount(prevCount => prevCount + newRecommendations.length);
            return [...prev, ...newRecommendations];
          }
          
          return prev;
        });
      }
    };

    console.log("Setting up global recommendationUpdate listener");
    eventEmitter.addListener('recommendationUpdate', handleRecommendationUpdate);

    return () => {
      console.log("Cleaning up global recommendationUpdate listener");
      eventEmitter.removeListener('recommendationUpdate', handleRecommendationUpdate);
    };
  }, []);

  const clearSuggestions = () => {
    setSuggestions([]);
    setNewSuggestionsCount(0);
    // Also clear from localStorage
    try {
      localStorage.removeItem(SUGGESTIONS_STORAGE_KEY);
      localStorage.removeItem(NEW_COUNT_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing suggestions from localStorage:', error);
    }
  };

  const removeSuggestion = (suggestionId) => {
    setSuggestions(prev => {
      // Find the suggestion being removed to check if it was new
      const suggestionToRemove = prev.find(suggestion => suggestion.id === suggestionId);
      const wasNew = suggestionToRemove?.is_new === true;
      
      // Filter out the suggestion
      const filtered = prev.filter(suggestion => suggestion.id !== suggestionId);
      
      // Only decrement the count if the removed suggestion was marked as new
      if (wasNew) {
        setNewSuggestionsCount(prevCount => Math.max(0, prevCount - 1));
      }
      
      return filtered;
    });
  };

  const resetNewSuggestionsCount = () => {
    setNewSuggestionsCount(0);
  };

  const markSuggestionsAsRead = () => {
    setSuggestions(prev => 
      prev.map(suggestion => ({ ...suggestion, is_new: false }))
    );
    setNewSuggestionsCount(0);
  };

  return (
    <SuggestionsContext.Provider value={{ 
      suggestions, 
      setSuggestions,
      newSuggestionsCount,
      setNewSuggestionsCount,
      clearSuggestions,
      removeSuggestion,
      resetNewSuggestionsCount,
      markSuggestionsAsRead
    }}>
      {children}
    </SuggestionsContext.Provider>
  );
};

export const useSuggestions = () => useContext(SuggestionsContext); 