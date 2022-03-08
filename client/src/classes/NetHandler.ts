class Net {
    init() {
        const url = new URL(window.location.href);
        const HOST = (url.hostname.includes("localhost")) ? "ws:localhost:3000" : "";
        const ws = new WebSocket(HOST);
        
        ws.addEventListener('message', (event) => {
            const newElement = document.createElement("p");
            newElement.textContent = event.data;
        });
        
        ws.addEventListener("open", function open() {
            const interval = setInterval(()=>ws.send(new Date().toTimeString()), 1000);
            ws.addEventListener("close", function close() {
                ws.removeEventListener("close", close);
                clearInterval(interval);
            })
        });
    }
}

export default Net;
