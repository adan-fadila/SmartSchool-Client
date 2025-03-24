import axios from 'axios';
import { SERVER_URL } from '../consts';

export const executeAcCommand = async (props) => {
  const { state, temperature, mode, roomName, id } = props;
  
  // Validate inputs
  if (!roomName) {
    console.error('Error: Room name is missing');
    throw new Error('Room name is required');
  }
  
  try {
    // Format: "{roomName} AC {on/off} {temperature?} {mode?}"
    const stateText = state ? 'on' : 'off';
    let actionString = `${roomName} AC ${stateText}`;
    
    // Add temperature and mode if available
    if (state && temperature) {
      actionString += ` ${temperature}`;
      
      if (mode) {
        actionString += ` ${mode}`;
      }
    }
    
    // Make the request to the execute endpoint
    const endpoint = `${SERVER_URL}/api-actions/execute`;
    const response = await axios.post(endpoint, { 
      actionString 
    });
    
    return response.data;
  } catch (error) {
    console.error('Error executing AC command:', error);
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    }
    throw error;
  }
};
