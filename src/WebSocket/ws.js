import { EventEmitter } from 'events';

export const eventEmitter = new EventEmitter();

let tempws;
if (window.location.protocol === "https:") {
    //tempws = new WebSocket('wss://software.shenkar.cloud:8080'); // for production    
    tempws = new WebSocket('ws://localhost:8002'); // for development
} else {
    //tempws = new WebSocket('ws://software.shenkar.cloud:8001'); // for production
    tempws = new WebSocket('ws://localhost:8002'); // for development
}
export const ws = tempws;

ws.addEventListener('open', () => {
    console.log('WebSocket connected successfully');
    console.log('WebSocket readyState:', ws.readyState);
});

ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.addEventListener('message', (event) => {
    try {
        const message = JSON.parse(event.data);
        console.log("Raw WebSocket message:", event.data);
        console.log("Parsed WebSocket message:", message);
        console.log("Message type:", message.type);

        if (message.type === 'anomaly_update') {
            console.log("Processing anomaly update with data:", message.data);
            console.log("Anomaly spaceId (raw):", message.data.spaceId);
            
            const spaceId = String(message.data.spaceId);
            const roomId = String(message.data.roomId);
            
            console.log("Anomaly spaceId (string):", spaceId);
            console.log("Anomaly roomId (string):", roomId);
            
            // Determine if this is a range anomaly or point anomaly
            const anomalies = message.data.anomalies;
            const isRangeAnomaly = anomalies && typeof anomalies === 'object' && !Array.isArray(anomalies) && 
                                  'start' in anomalies && 'end' in anomalies;
            const isPointAnomaly = Array.isArray(anomalies);
            
            console.log("Anomaly type determination:", {
                isRangeAnomaly,
                isPointAnomaly,
                anomalyStructure: typeof anomalies
            });
            
            // Set anomaly type based on structure
            const anomalyType = isRangeAnomaly ? 'collective' : 
                               isPointAnomaly ? 'pointwise' : 
                               message.data.anomalyType || 'unknown';
            
            eventEmitter.emit('anomalyUpdate', {
                ...message.data,
                plotImage: message.data.plot_image,
                collectivePlot: message.data.collective_plot,
                deviceType: message.data.sensorType,
                roomId: roomId,
                spaceId: spaceId,
                timestamp: message.data.timestamp,
                anomalies: message.data.anomalies,
                rawEventName: message.data.rawEventName,
                completeAnomalyName: message.data.completeAnomalyName,
                anomalyType: anomalyType, // Use the determined type
                name: message.data.name
            });
        } 
        else if (message.type === 'recommendation_update') {
            console.log("Processing recommendation update with data:", message.data);
            
            // Handle new format with recommended_rules array directly in data
            if (message.data.recommended_rules && Array.isArray(message.data.recommended_rules)) {
                console.log("Processing recommendations in new format (direct):", message.data.recommended_rules);
                
                const transformedRecommendations = message.data.recommended_rules.map((rule, index) => {
                    // Extract device info from the rule
                    const ruleLower = rule.toLowerCase();
                    let device = 'Unknown Device';
                    
                    // Try to extract device from rule text
                    const deviceMatch = ruleLower.match(/then\s+([a-z\s]+)\s+([a-z]+)\s+(on|off)/i);
                    if (deviceMatch && deviceMatch.length >= 3) {
                        device = `${deviceMatch[1]} ${deviceMatch[2]}`.trim();
                    }
                    
                    return {
                        id: `rule_${index}_${Date.now()}`,
                        device: device,
                        normalized_rule: rule,
                        is_new: true
                    };
                });
                
                console.log("Final transformed recommendations:", transformedRecommendations);
                eventEmitter.emit('recommendationUpdate', transformedRecommendations);
                return;
            }
            
            // Handle new format with recommended_rules nested inside recommendations object
            if (message.data.recommendations && message.data.recommendations.recommended_rules && 
                Array.isArray(message.data.recommendations.recommended_rules)) {
                
                console.log("Processing recommendations in new nested format:", message.data.recommendations.recommended_rules);
                
                const transformedRecommendations = message.data.recommendations.recommended_rules.map((rule, index) => {
                    // Extract device info from the rule
                    const ruleLower = rule.toLowerCase();
                    let device = 'Unknown Device';
                    
                    // Try to extract device from rule text
                    const deviceMatch = ruleLower.match(/then\s+([a-z\s]+)\s+([a-z]+)\s+(on|off)/i);
                    if (deviceMatch && deviceMatch.length >= 3) {
                        device = `${deviceMatch[1]} ${deviceMatch[2]}`.trim();
                    }
                    
                    return {
                        id: `rule_${index}_${Date.now()}`,
                        device: device,
                        normalized_rule: rule,
                        is_new: true
                    };
                });
                
                console.log("Final transformed recommendations:", transformedRecommendations);
                eventEmitter.emit('recommendationUpdate', transformedRecommendations);
                return;
            }
            
            // Handle old format (keeping for backward compatibility)
            if (message.data.recommendations && typeof message.data.recommendations === 'object' && 
                !Array.isArray(message.data.recommendations) && 
                !message.data.recommendations.recommended_rules) {
                
                console.log("Processing recommendations in old format:", message.data.recommendations);
                
                const transformedRecommendations = [];
                
                for (const [device, recommendations] of Object.entries(message.data.recommendations)) {
                    if (!Array.isArray(recommendations)) {
                        console.error(`Recommendations for ${device} is not an array:`, recommendations);
                        continue;
                    }
                    
                    console.log(`Processing device: ${device}`, recommendations);
                    recommendations.forEach(rec => {
                        if (!rec.recommendation || !rec.recommended_time) {
                            console.error(`Invalid recommendation format for ${device}:`, rec);
                            return;
                        }
                        
                        const transformed = {
                            id: `${device}_${rec.recommendation}_${rec.recommended_time}`.replace(/\s+/g, '_'),
                            device: device.replace(/_/g, ' '),
                            normalized_rule: `Turn ${rec.recommendation} during ${rec.recommended_time}`,
                            is_new: true
                        };
                        console.log("Transformed recommendation:", transformed);
                        transformedRecommendations.push(transformed);
                    });
                }
                
                if (transformedRecommendations.length === 0) {
                    console.warn("No recommendations were transformed");
                    return;
                }
                
                console.log("Final transformed recommendations:", transformedRecommendations);
                eventEmitter.emit('recommendationUpdate', transformedRecommendations);
            } else {
                console.error("No valid recommendations format found in message data");
            }
        }
    } catch (error) {
        console.error('Error processing WebSocket message:', error);
        console.error('Raw message that caused error:', event.data);
    }
});

ws.addEventListener('close', () => {
    console.error('WebSocket connection closed');
});