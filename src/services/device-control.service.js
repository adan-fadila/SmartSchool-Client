import axios from 'axios';
import { SERVER_URL } from '../consts';

export const executeDeviceAction = async ({ room, device, state, temperature, mode }) => {
  try {
    // Construct the action string based on the parameters
    let actionString = `${room} ${device}`;
    
    if (device.toLowerCase() === 'ac') {
      if (state === false) {
        actionString += ' off';
      } else {
        actionString += ` on ${temperature || '24'} ${mode || 'cool'}`;
      }
    }

    const response = await axios.post(`${SERVER_URL}/api-actions/execute`, {
      actionString
    });

    return response.data;
  } catch (error) {
    console.error('Error executing device action:', error);
    throw error;
  }
}; 