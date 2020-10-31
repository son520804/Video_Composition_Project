// FIXME: there is an extra line at the end of all cells because of a recording problem

define([
    'jquery',
    'base/js/namespace',
    'require',
    'contents',
    'base/js/dialog',
    'base/js/i18n',
    'base/js/utils',
    './module/helperFuncs'
], function (
    $,
    Jupyter,
    require,
    contents_service,
    dialog,
    i18n,
    utils,
    helpers
) {
    "use strict";

    // Step Back function
    // TODO: try to save interpreter states
    // TODO: try notebook checkpoints. Save checkpoint after each event and then revert

    // need separate flask app to dump state and restore interpreter state
    // TODO: talk to Chris about this

    let fileData = "";
    let actionArray = [];
    let playBack = false;

    let sound;

    let performActionFunc;

    let actionCounter = 0;

    let timer = 0;

    let audioLength = 0;

    // need to keep track of remaining time left on interval when using pause and play
    let timeOfLastAction = 0;
    let intervalTimeRemaining = 0;

    let siteDiv = document.getElementById("site");

    // typing options enum
    let TYPINGOPTIONS = Object.freeze({'letter': 'Letter by Letter (With Comments)',
                                       'line': 'Line by Line (With Comments)',
                                       'noComments': 'Code Letter by Letter (No Comments)'});
    let typingOption = 0;

    function toSeconds(duration) {
        if (duration == null) {
            return 0;
        }
        let a  = duration.split(':');
        let seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 

        return seconds
    }

    let currentCellIndex = 0;
    let currentLineNumber = 0;

    function playCallback() {
        // need to resume everything that was paused in pauseCallback()

        // set interval for performActionFunc
        // need correct interval that was calculated in pauseCallback()
        //console.log("Setting interval to:" + intervalTimeRemaining);
        performActionFunc = setInterval(performAction, intervalTimeRemaining);

        // resume sound
        if (sound != null) {
            sound.play();
        }

        // show pause button and hide play button
        $('#pbPause').show();
        $('#pbPlay').hide();
    }

    function pauseCallback() {
        /*  Things to pause:
                1. code playback (performAction function)
                2. audio file (sound)
                3. progress bar and text. May not need to do this as audio progress does not change
            
            Then show the play button and hide the pause button
        */

        // clear interval for the performActionFunc
        // need to calculate the amount of time left on the interval
        clearInterval(performActionFunc);
        intervalTimeRemaining = new Date().getTime() - timeOfLastAction;

        // pause sound
        if (sound != null) {
            sound.pause();
        }

        // show play button and hide pause button
        $('#pbPlay').show();
        $('#pbPause').hide();
    }

    // function stepbackCallback() {

    // }

    // Types out text in the given notebook cell
    // content: string to add to cell
    // cell: notebook cell to add text to
    // offset: offset-from-previous-event (for next event) for calculating typing speed
    async function typing_cell(content, cell, offset){

        let current = cell.get_text();

        if (typingOption === TYPINGOPTIONS.line) {
            // print whole line at once
            current += content;
            cell.set_text(current);
        }
        else {
            // calculating typingSpeed from string length and offsets
            let typingSpeed = (offset / content.length) * 0.75;

            if (typingSpeed > 200) {
                typingSpeed = 180;
            }

            // convert content string into a char array
            let charArray = [...content];

            if (typingSpeed > 30) {
                // type out each character of line one by one
                for (let char of charArray) {
                    current += char;
                    cell.set_text(current);
                    await delay(typingSpeed);
                }
            }
            else {
                // paste whole line as there isn't enough time to type it all out
                current += content;
                cell.set_text(current);
            }
        }

        return 1;
    }

    function rebaseIndices() {
        // Goes through the log file and rebases indices to start at 0
        let ogIndex = actionArray[1]["cell index"];
        let i = 1
        if (ogIndex == null) {
            ogIndex = actionArray[2]["cell index"]
            i = 2
        }
        let rebasedIndex = 0;

        for ( ; i < actionArray.length; i++) {
            if (actionArray[i]["cell index"] !== ogIndex) {
                rebasedIndex++;
                ogIndex = actionArray[i]["cell index"];
            }

            actionArray[i]["cell index"] = rebasedIndex;
        }

        // delay start of playback by 1 second
        setTimeout(StartPlayback, 1000);
    }

    function checkLogFile() {
        // checks to see if the cell index starts at 0
        // if not, then ask the user if they want to rebase at 0

        if (actionArray[1]["cell index"] !== 0) {
            // ask user if they want to rebase to 0

            let form = "Log file starts at cell " + actionArray[1]["cell index"] + ", rebase log to start at 0?"

            dialog.modal({
                title: i18n.msg._('Rebase Cell Indices'),
                body: form,
                buttons: {
                    'Start Playback' : {
                        'id': 'rebase_btn',
                        'class': 'btn-primary', 'click': function() {
                            rebaseIndices();
                        }
                    },
                    'Cancel Playback': {
                        'class': 'btn-default',
                        'click': function() {
                            console.log('cancelled upload');
                        }
                    }
                }
            })
        }
        else {
            setTimeout(StartPlayback, 1000);
        }
    }

    async function performAction(action, fixTime) {
        // Parameters:
        //              action: specificed action to perform
        //              fixTime: time difference between logFile and playback
        //
        // Performs the action passed as a parameter

        // start a timer to track the time the action events take
        let t1 = performance.now();

        // stop function if log file is done
        if (action.type == "end") {
            console.log("finished playback");
            playBack = false;
            return;
        }

        // Get the length of the action and convert it into milliseconds
        // add fixTime to self-correct the code-playback with the audio
        let newInterval = parseInt(actionArray[++actionCounter]["from_previous"]) + fixTime;

        if (action.type == "Line") {

            // scroll up
            scrollUp();

            if (typingOption !== TYPINGOPTIONS.noComments ||
                action["line text"].trim()[0] !== '#' ||
                action["cell type"] === 'markdown') {
                    
                let cell = Jupyter.notebook.get_cell(currentCellIndex);

                if (cell == null) {
                    // need to add a cell to Jupyter notebook
                    cell = Jupyter.notebook.insert_cell_at_index(action['cell type'], currentCellIndex);

                    // need to enter rendered markdown to change it
                    if (action['cell type'] === "markdown") {
                        cell.unrender();
                    }
                }
                let cm = cell.code_mirror;

                if (action["next cell"] === false || action["next cell"] == null) {
                    // need offset from previous from next action for typing time
                    await typing_cell(action["line text"] + '\n', cell, newInterval);
                    //console.log("finished typing");
                    currentLineNumber++;
                }

                // check for last line
                if (action["move cursor"] === true) {
                    let cm = Jupyter.notebook.get_cell(currentCellIndex).code_mirror;
                    // move cursor to end of line
                    cm.setCursor({line: currentLineNumber, ch: action["line text"].length})
                }

            }
        }

        else if (action.type == "Execution" || action.type == "Render") {
            // execute cell
            console.log(currentCellIndex);
            let cell = Jupyter.notebook.get_cell(currentCellIndex);
            if (cell !== null) {
                if (cell.get_text() !== '') {
                    Jupyter.notebook.execute_cells([currentCellIndex]);
                    currentCellIndex++;
                    currentLineNumber = 0;
                }
            }
        }

        // end timer of function
        let t2 = performance.now();

        // calculate how long the action took to process
        let actionTime = t2 - t1;

        // calculate the time before next action
        let nextEventDelay = newInterval - actionTime;

        if (nextEventDelay < 0 || nextEventDelay == null) {
            console.log("action took too long");
            // run next action immediately
            return 0;
        }

        // return the time to wait before starting the next action
        return nextEventDelay;

    }

    function moveProgressBar() {
        // from https://www.w3schools.com/howto/howto_js_progressbar.asp
        // Moves the progress bar based on the time elapsed from the audio file

        let width = 0;
        let id = setInterval(frame, 10);

        function frame() {
            if (width >= 1) {
                clearInterval(id);
            }
            else {
                //console.log(sound.currentTime);
                //console.log(sound.duration);
                width = (sound.currentTime / sound.duration);
                // update bar and current time
                $("#myBar").css("width", (width * 100).toString() + '%');
                $("#progressText").text(new Date(sound.currentTime * 1000).toISOString().substr(14, 5));
            }
        }
    }

    function appendPlaybackControls() {
        // adds play, pause, and stop buttons to the notebook header
        // also adds the progress bar to the header

        // get length of audio
        audioLength = sound.duration;

        let showProgress = $("<div class='showProgress'>");

        // // add play, pause, and go back buttons to bottom side
        // let playbackControls = $("<div id='pbControls'>");
        // let playBtn = $("<i title='Play' id='pbPlay' class='fa fa-play playBtn' aria-hidden='true'></i>").hide();
        // playBtn.on('click', playCallback);
        // let pauseBtn = $("<i title='Pause' id='pbPause' class='fa fa-pause playBtn' aria-hidden='true'></i>");
        // pauseBtn.on('click', pauseCallback);

        // playbackControls.append(playBtn);
        // playbackControls.append(pauseBtn);
        // // let backBtn = $("<i title='Step-Back' id='pbBack' class='fas fa-step-backward' aria-hidden='true'></i>");
        // // backBtn.on('click', stepbackCallback);
        // // playbackControls.append(backBtn);
        // showProgress.append(playbackControls);

        let progressDiv = $('<div id="progressDiv"></div>');

        // need current timer on left
        progressDiv.append("<div id='progressText' class='progressText floatLeft'>" + new Date(0 * 1000).toISOString().substr(14, 5) + "</div>")

        // add progress bar
        let progressBar = $("<div id='myProgress' class='floatLeft'>");
        
        progressBar.append("<div id='myBar'>");

        progressDiv.append(progressBar);

        // length of audio file on the right
        progressDiv.append("<div id='audioDuration' class='progressText floatLeft'>" + new Date(audioLength * 1000).toISOString().substr(14, 5) + "</div>")

        // append to showProgress
        showProgress.append(progressDiv);

        // start progress bar
        moveProgressBar();

        $('#header').append(showProgress);
    }

    async function delay(ms) {
        // async function to delay execution
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    async function performActions() {
        // Runs through all the actions from the logFile

        // start the audio file and append playback controls afterwards
        //sound.play().then(appendPlaybackControls);

        // need to change first cell if markdown
        if (actionArray[1]['cell type'] !== null && actionArray[1]['cell type'] === 'markdown') {
            Jupyter.notebook.to_markdown(0);
        }

        sound.play();

        for (let action of actionArray) {

            // calculate the diff of audio file time and logFile time
            let offset_from_start = parseInt(action["from_start"]);
            let fixTime = offset_from_start - (sound.currentTime * 1000);

            // wait for action to be performed
            let result = await performAction(action, fixTime);

            // delay execution of next action
            await delay(result);
        }
    }

    function StartPlayback() {
        // sets up environment for playback
        if (!playBack) {
            //console.log("starting playback");

            // FIXME: commented out to hide the video
            //$('#videoDiv').show();

            playBack = true;

            actionCounter = 0;
            
            currentCellIndex = 0;
            currentLineNumber = 0;

            // get typing option
            let typingLogFile = actionArray[0]['typingOption'];

            if (typingLogFile === 'noComments') {
                typingOption = TYPINGOPTIONS.noComments;
            }
            else if (typingLogFile === 'line') {
                typingOption = TYPINGOPTIONS.line;
            }
            else {
                typingOption = TYPINGOPTIONS.letter;
            }

            //timer = new Date().getTime();

            //window.actionArray = actionArray;

            // start the playback
            performActions()
        }
    }

    function setFiles() {
        // Sets the audio and log files based on the user's file uploads
        let logFile = document.getElementById('logFile').files[0]

        let reader = new FileReader();

        reader.onload = function(event) {
            //console.log(event.target.result);
            fileData = event.target.result;

            fileData = "[" + fileData + "]";

            actionArray = JSON.parse(fileData);

            setTimeout(StartPlayback, 1000);
        }

        reader.readAsText(logFile);

        let notebookName = logFile.name.replace('.txt', '');
        // rename notebook to matcht the log file
        Jupyter.notebook.rename(notebookName);

        let soundFile = document.getElementById('audioFile').files[0]

        sound = document.getElementById('sound');

        sound.src = URL.createObjectURL(soundFile);

        sound.onend = function(e) {
            URL.revokeObjectURL(this.src);
        }
    }

    function onFileSelected(event) {
        // sets the log file and parses it into an array
        let selectedFile = event.target.files[0];
        let reader = new FileReader();

        reader.onload = function(event) {
            //console.log(event.target.result);
            fileData = event.target.result;

            fileData = "[" + fileData + "]";

            actionArray = JSON.parse(fileData);
        }

        reader.readAsText(selectedFile);
    }

    function onAudioSelected(event) {
        // from here: https://stackoverflow.com/questions/28619550/javascript-play-uploaded-audio
        // Sets the audio file based on the user's suggestion
        sound = document.getElementById('sound');

        sound.src = URL.createObjectURL(this.files[0]);

        sound.onend = function(e) {
            URL.revokeObjectURL(this.src);
        }
    }

    function fileUploadDialog() {

        let form = $('<form>Log File: </form>').attr('id', 'uploadForm').attr('onSubmit', 'return false');
        form.append("<input id='logFile' type='file' />");

        form.append("<div>Video: <input id='audioFile' type='file' /></div>");

        dialog.modal({
            title: i18n.msg._('Upload Log File and/or Audio File'),
            body: form,
            buttons: {
                'Start Playback' : {
                    'id': 'upload-button',
                    'class': 'btn-primary', 'click': function() {
                        setFiles();
                    }
                },
                'Cancel': {
                    'class': 'btn-default',
                    'click': function() {
                        console.log('cancelled upload');
                    }
                }
            }
        }).on('shown.bs.modal', function() {
            // set focus to input box when dialog box is opened
            setTimeout(function () {
                // set timeout of 10 ms because Jupyter dialog modal sets the focus to cancel button first
                $('#upload-button').focus();
                //document.getElementById('logFile').addEventListener('change', onFileSelected, false);
                //document.getElementById('audioFile').addEventListener('change', onAudioSelected, false);
            }, 10);
        }).keypress(function (e) {
            if (e.which === 13) {
                // 13 is the code for enter
                // need to activate the Join button
                // click join-button
                $('#upload-button').click();
            }
        });
    }

    function togglePlaybackControls() {
        // toggles visibility of playback controls
        $('.showProgress').toggle();
    }

    function scrollUp() {
        // Scrolls up
        if (playBack) {
            siteDiv.scrollTop = siteDiv.scrollHeight;
        }
    }

    function load_ipython_extension(){

        let link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = require.toUrl('./playback.css');
        document.getElementsByTagName("head")[0].appendChild(link);

        // add the share button to the Jupyter notebook
        Jupyter.toolbar.add_buttons_group([{
            label: 'Playback',
            icon: 'fa-play-circle',
            id: "playbackBtn",
            callback: fileUploadDialog
        }]);

        // add shortcut for hiding playback controls
        Jupyter.keyboard_manager.edit_shortcuts.add_shortcut("Ctrl-shift-h", togglePlaybackControls);
        Jupyter.keyboard_manager.command_shortcuts.add_shortcut("Ctrl-shift-h", togglePlaybackControls);

        $(document).ready(function() {
            // add video to notebook
            $('#header').append("<div id='videoDiv'></div>")
            $('#videoDiv').append("<video class='video' id='sound'></video>");
        });
        
        Jupyter.notebook.set_autosave_interval(0);

        // call scroll up if execution finished
        Jupyter.notebook.events.on('finished_execute.CodeCell', scrollUp);
    }
    return {
        load_ipython_extension: load_ipython_extension
    };
});