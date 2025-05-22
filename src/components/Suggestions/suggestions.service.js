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