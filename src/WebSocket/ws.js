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
    console.log('connected');
});

ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.addEventListener('message', (event) => {
    try {
        const message = JSON.parse(event.data);
        console.log("Complete WebSocket message:", message);

        if (message.type === 'anomaly_update') {
            console.log("Processing anomaly update with data:", message.data);

            eventEmitter.emit('anomalyUpdate', {
                ...message.data,
                plotImage: message.data.plot_image,
                collectivePlot: message.data.collective_plot,
                anomalies: message.data.anomalies
            });
        }
    } catch (error) {
        console.error('Error processing WebSocket message:', error);
    }
});