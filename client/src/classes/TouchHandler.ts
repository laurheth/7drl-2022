class TouchHandler {
    private minLength:number;
    private maxTime:number;
    private ratioNeeded:number;
    private startPos:[number,number]|null;
    private lastPos:[number,number]|null;
    private endPos:[number,number]|null;
    private startTime:number|null;
    constructor(element:HTMLElement) {

        this.reset();

        this.minLength = 30; // pixels
        this.maxTime = 1000; // milliseconds
        this.ratioNeeded = 1.5; // Diagonal swipes are ambiguous! Ratio needed for clarity

        this.startPos=null;
        this.lastPos=null;
        this.endPos=null;
        this.startTime=null;

        element.addEventListener("touchstart", (event) => this.handleStart(event),true);
        element.addEventListener("touchmove", (event) => this.handleMove(event), true);
        element.addEventListener("touchend", (event) => this.handleEnd(event), true);
        element.addEventListener("touchcancel",(event)=>this.handleCancel(event),true);
    }

    handleStart(event:TouchEvent) {
        event.preventDefault();

        this.reset();
        console.log("start");
        const touch = event.changedTouches[0];
        this.startPos = [touch.pageX, touch.pageY]; // store where the swipe started
        this.startTime = (new Date()).getTime();
    }

    handleMove(event:TouchEvent) {
        event.preventDefault();
        const touch = event.changedTouches[0];
        this.endPos = [touch.pageX, touch.pageY]; // store where the swipe ends
        this.lastPos=[...this.endPos];
    }

    handleCancel(event:TouchEvent) {
        event.preventDefault();
        this.reset();
    }
    
    handleEnd(event:TouchEvent) {
        event.preventDefault();
        console.log("end", this.endPos, this.startPos, this.startTime);
        if (this.endPos && this.startPos && this.startTime) {
            try {
                const endTime = (new Date()).getTime();
                const delta = [this.endPos[0]-this.startPos[0],this.endPos[1]-this.startPos[1]];
                const deltaLength = Math.sqrt(delta[0]**2 + delta[1]**2);
                if ((endTime - this.startTime) < this.maxTime && deltaLength > this.minLength) {
                    if (Math.abs(delta[0] / delta[1]) > this.ratioNeeded) {
                        if (delta[0] > 0) {
                            this.sendSwipe('Right');
                        }
                        else {
                            this.sendSwipe('Left');
                        }
                    }
                    else if (Math.abs(delta[1] / delta[0]) > this.ratioNeeded) {
                        if (delta[1] > 0) {
                            this.sendSwipe('Down');
                        }
                        else {
                            this.sendSwipe('Up');
                        }
                    }
                }
            }
            catch(err) {
                // The swipe broke. It's probably not a big deal?
            }
        }

        this.reset();
    }
    reset() {
        // Reset numbers
        this.startPos = null;
        this.lastPos=null;
        this.endPos = null;
        this.startTime = null;
    }

    // Send the swipe event to the appropriate place
    sendSwipe(swipeString:string) {
        console.log(swipeString);
        const event:KeyboardEvent = new KeyboardEvent("keydown",{
            key:swipeString
        });
        window.dispatchEvent(event);
    }
}

export default TouchHandler;