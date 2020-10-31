define((require, exports, module)=> {

    const msToTime = (duration) => {
        // helper function that turns seconds into minutes and seconds
        // credit to https://stackoverflow.com/questions/5539028/converting-seconds-into-hhmmss
        // totalSeconds = Number(totalSeconds);

        // let h = Math.floor(totalSeconds / 3600);
        // let m = Math.floor(totalSeconds % 3600 / 60);
        // let s = Math.floor(totalSeconds % 3600 % 60);

        // return ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);

        let milliseconds = parseInt((duration % 1000) / 100),
        seconds = parseInt((duration / 1000) % 60),
        minutes = parseInt((duration / (1000 * 60)) % 60),
        hours = parseInt((duration / (1000 * 60 * 60)) % 24);

        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
    }

    const secondsToMs = (secondsStr) => {
        let seconds = parseFloat(secondsStr.substring(0, secondsStr.length));
        return seconds * 1000;
    }

    module.exports = {
        msToTime: msToTime,
        secondsToMs: secondsToMs
    }
})