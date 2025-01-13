import React, { createContext, useState, useContext, useEffect } from 'react';
import { eventEmitter } from '../WebSocket/ws';

const SuggestionsContext = createContext();

export const SuggestionsProvider = ({ children }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [newSuggestionsCount, setNewSuggestionsCount] = useState(0);

  useEffect(() => {
    const handleRecommendationUpdate = (recommendations) => {
      console.log("Global suggestions update received:", recommendations);
      if (Array.isArray(recommendations)) {
        setSuggestions(recommendations);
        setNewSuggestionsCount(prev => prev + recommendations.length);
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
  };

  const removeSuggestion = (suggestionId) => {
    setSuggestions(prev => prev.filter(suggestion => suggestion.id !== suggestionId));
    setNewSuggestionsCount(prev => Math.max(0, prev - 1));
  };

  return (
    <SuggestionsContext.Provider value={{ 
      suggestions, 
      setSuggestions,
      newSuggestionsCount,
      setNewSuggestionsCount,
      clearSuggestions,
      removeSuggestion
    }}>
      {children}
    </SuggestionsContext.Provider>
  );
};

export const useSuggestions = () => useContext(SuggestionsContext); 