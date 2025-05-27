import axios from 'axios';
import { SERVER_URL } from '../../consts';




const temperatureMap = {
    1: 15,
    2: 20,
    3: 27,
    4: 35
}

const getStrongestEvidence = (evidence) => {
  const strongestEvidence = Object.entries(evidence).reduce((prev, current) =>
    prev[1] > current[1] ? prev : current
  );
  return strongestEvidence;
};



export const generateRule = (suggestion) => {
  const { device, evidence, state } = suggestion;
  const isAcDevice = device.toLowerCase() === 'ac';

  // Get strongest evidence
  const strongestEvidence = getStrongestEvidence(evidence);
  const conditions = `${strongestEvidence[0]} < ${temperatureMap[strongestEvidence[1]]}`;

  const action = `("${device} ${state}")`;

  const generatedRule = `IF ${conditions} THEN TURN${action}`;
  console.log({ generatedRule });
  return generatedRule;
};


  

export const getSuggestions = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api-suggestion/suggestions`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  };


  export const updateSuggestions = async () => {
    try{
      const response = await axios.put(`${SERVER_URL}/api-suggestion/suggestions`,{
        is_new: false
      });
      
    }catch(error){
      console.log('Error updating suggestions:', error);
    }
  }

  export const addSuggestedRule = async (rule, suggestionId, suggestions, setSuggestions) => {
    try {
      const response = await axios.post(`${SERVER_URL}/api-rule/rules`, { rule });
      if(response.status === 200){
        onDeleteSuggestion(
          suggestionId, 
          suggestions,
          setSuggestions
        )
      }
    } catch (error) {
      console.log('Error Adding rule: ', error.message);
    }
  };
  

  export const onDeleteSuggestion = async (id, suggestions, setSuggestions) => {
    try {
      console.log('Deleting suggestion with ID:', id);
      await axios.delete(`${SERVER_URL}/api-suggestion/suggestions/${id}`);
      const filteredSuggestions = suggestions.filter(suggestion => suggestion.id !== id);
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error deleting suggestion: ' + error.message);
    }
  };



  export const addRoomToRule =  async(rule, room) => {
    // Check if the rule already contains a room reference
    if (rule.includes(` in ${room}`)) {
      // Rule already has this room, just add it as is
      await axios.post(`${SERVER_URL}/api-rule/rules`, {rule: rule});
      return;
    }

    // Handle new format rules (if ... then ... format)
    if (rule.toLowerCase().startsWith('if ') && rule.includes(' then ')) {
      // For rules in the format "if Living Room motion true then Living Room LIGHT on"
      // We don't need to add the room since it's already specified in the rule
      await axios.post(`${SERVER_URL}/api-rule/rules`, {rule: rule});
      return;
    }

    // Handle old format rules (Turn X during Y)
    const ruleWithRoom = rule + ` in ${room}`;
    await axios.post(`${SERVER_URL}/api-rule/rules`, {rule: ruleWithRoom});
  }

export const createRuleFromSuggestion = async (suggestionRule, suggestionId, spaceId) => {
  try {
    console.log('Parsing suggestion rule:', suggestionRule);
    console.log('Space ID:', spaceId);
    
    // Validate inputs
    if (!suggestionRule || typeof suggestionRule !== 'string') {
      throw new Error('Invalid suggestion rule provided');
    }
    
    if (!spaceId) {
      throw new Error('Space ID is required to create a rule');
    }
    
    // Parse the suggestion rule format: "if Living Room motion true then Living Room LIGHT on"
    const ruleMatch = suggestionRule.match(/^if\s+(.+?)\s+then\s+(.+)$/i);
    
    if (!ruleMatch) {
      throw new Error('Invalid rule format. Expected format: "if [condition] then [action]"');
    }
    
    const eventPart = ruleMatch[1].trim();
    const actionPart = ruleMatch[2].trim();
    
    if (!eventPart || !actionPart) {
      throw new Error('Both event and action parts are required');
    }
    
    console.log('Event part:', eventPart);
    console.log('Action part:', actionPart);
    
    // Parse event part - handle different formats
    let eventString = '';
    let roomId = null;
    let location = null;
    
    // Check for motion events: "Living Room motion true"
    const motionMatch = eventPart.match(/^(.+?)\s+(motion)\s+(true|false)$/i);
    if (motionMatch) {
      location = motionMatch[1].trim();
      const eventType = motionMatch[2];
      const condition = motionMatch[3];
      eventString = `${location} ${eventType} ${condition}`;
    } else {
      // Check for temperature/humidity events: "Living Room temperature > 23.2"
      const sensorMatch = eventPart.match(/^(.+?)\s+(temperature|humidity)\s*([><=!]+)\s*(.+)$/i);
      if (sensorMatch) {
        location = sensorMatch[1].trim();
        const eventType = sensorMatch[2];
        const operator = sensorMatch[3];
        const value = sensorMatch[4];
        eventString = `${location} ${eventType} ${operator} ${value}`;
      } else {
        // Fallback - use the event part as is
        eventString = eventPart;
        // Try to extract location from the beginning
        const locationMatch = eventPart.match(/^([^a-z]*[A-Z][^a-z]*(?:\s+[A-Z][^a-z]*)*)/);
        location = locationMatch ? locationMatch[1].trim() : null;
      }
    }
    
    // Parse action part - handle different formats
    let actionString = '';
    
    // Check for device control: "Living Room LIGHT on" or "Living Room AC on 21 cool"
    const deviceMatch = actionPart.match(/^(.+?)\s+([A-Z]+)\s+(on|off)(?:\s+(.+))?$/i);
    if (deviceMatch) {
      const actionLocation = deviceMatch[1].trim();
      const deviceType = deviceMatch[2];
      const state = deviceMatch[3];
      const additionalParams = deviceMatch[4] || '';
      
      actionString = `${actionLocation} ${deviceType} ${state}`;
      if (additionalParams) {
        actionString += ` ${additionalParams}`;
      }
      
      // Use action location if event location wasn't found
      if (!location) {
        location = actionLocation;
      }
    } else {
      // Fallback - use the action part as is
      actionString = actionPart;
    }
    
    // Validate that we have the required strings
    if (!eventString || !actionString) {
      throw new Error('Failed to parse event or action from the suggestion');
    }
    
    // Try to get room_id by looking up the room name in the space
    if (location && spaceId) {
      try {
        console.log('Looking up room for location:', location, 'in space:', spaceId);
        const roomResponse = await axios.get(`${SERVER_URL}/api-room/rooms/space/${spaceId}`);
        
        if (roomResponse.data && Array.isArray(roomResponse.data)) {
          const room = roomResponse.data.find(r => 
            r.name && r.name.toLowerCase() === location.toLowerCase()
          );
          
          if (room) {
            roomId = room.id;
            console.log('Found room ID:', roomId, 'for location:', location);
          } else {
            console.warn('No room found for location:', location);
            // Don't throw an error here, let the backend handle it
          }
        }
      } catch (error) {
        console.warn('Could not resolve room_id for location:', location, error);
        // Don't throw an error here, continue without room_id
      }
    }
    
    // Create the rule data object
    const ruleData = {
      description: suggestionRule,
      event: eventString,
      action: actionString,
      room_id: roomId,
      space_id: spaceId,
      created_by: 'AI Suggestion',
      isNotificationRule: false,
      notificationPhoneNumber: null,
      notificationMessage: null
    };
    
    console.log('Creating rule with data:', ruleData);
    
    // Create the rule using the same API as AddRuleComponent
    const response = await axios.post(`${SERVER_URL}/api-rule/rules`, ruleData);
    
    if (response.status === 200 || response.status === 201) {
      console.log('Rule created successfully');
      return response.data;
    } else {
      throw new Error(`Failed to create rule. Server responded with status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error creating rule from suggestion:', error);
    throw error;
  }
};