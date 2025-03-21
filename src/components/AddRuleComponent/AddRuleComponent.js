import React, { useState, useEffect } from 'react';
import classes from './AddRuleComponent.module.scss';
import { toast } from 'react-toastify';
import { SERVER_URL } from '../../consts';

const AddRuleComponent = ({ onSuccess, spaceId, fullName }) => {
  const [ruleText, setRuleText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api-room/rooms/space/${spaceId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setRooms(data);
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
        if (isMounted) {
          toast.error(`Failed to fetch rooms. ${error.message}`);
        }
      }
    };

    fetchRooms();

    return () => {
      isMounted = false;
    };
  }, [spaceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that the rule text is not empty
    if (!ruleText.trim()) {
      toast.error('Please enter a rule');
      return;
    }
    
    // Parse the rule text
    const ruleLower = ruleText.toLowerCase();
    if (!ruleLower.startsWith('if ') || !ruleLower.includes(' then ')) {
      toast.error('Rule must follow the format: "if [condition] then [action]"');
      return;
    }
    
    // Extract parts
    const parts = ruleLower.split(' then ');
    let condition = parts[0].substring(3).trim(); // Remove 'if ' from the start
    const action = parts[1].trim();
    
    // Extract room name from condition (e.g., "living room temperature > 10")
    const conditionParts = condition.split(' ');
    let roomName = '';
    
    // Try to identify the room name from the condition
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i].name.toLowerCase();
      if (condition.includes(room)) {
        roomName = room;
        break;
      }
    }
    
    if (!roomName) {
      toast.error('Could not identify a valid room name in the condition');
      return;
    }
    
    // Find room ID
    const room = rooms.find(r => r.name.toLowerCase() === roomName);
    if (!room) {
      toast.error(`Room "${roomName}" not found`);
      return;
    }
    
    setIsSubmitting(true);
    
    // Prepare the rule data
    const ruleData = {
      description: ruleText,
      event: condition,
      action: action,
      room_id: room.id,
      space_id: spaceId,
      created_by: fullName || 'User'
    };
    
    try {
      const response = await fetch(`${SERVER_URL}/api-rule/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });
      
      if (response.ok) {
        toast.success('Rule added successfully!');
        setRuleText('');
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to add rule');
      }
    } catch (error) {
      console.error('There was an error!', error);
      toast.error(`Failed to add the rule. ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={classes.formContainer}>
      <form onSubmit={handleSubmit}>
        <div className={classes.textInputContainer}>
          <label htmlFor="ruleInput" className={classes.ruleLabel}>
            Enter your rule:
          </label>
          <textarea
            id="ruleInput"
            className={classes.ruleTextArea}
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            placeholder="if [room name] [condition] then [room name] [action]"
            rows={4}
          />
          <div className={classes.hint}>
            <p>Format examples:</p>
            <p>- if Living Room Temperature {'>'} 26 then Living Room AC on</p>
            <p>- if Living Room Temperature {'>'} 10 then Living Room AC on 20 heat</p>
            <p>- if Kitchen Motion detected then Kitchen Light on</p>
          </div>
        </div>
        <button
          type="submit"
          className={classes.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Rule'}
        </button>
      </form>
    </div>
  );
};

AddRuleComponent.defaultProps = {
  spaceId: '',
  fullName: '',
};

export default AddRuleComponent;
