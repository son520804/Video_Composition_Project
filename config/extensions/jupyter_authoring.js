/*
Noting that there could be two "modes" for the final product, one which is visual and one which is invisible (the latter has some specific benefits actually).

1. start_recording(): records the current timestamp
    bount to ctrl+b

2. stop_recording(): records both the current timestamp and the difference between the start recording time and the current time (e.g. and offset)
record_line(): records the current cell number, the current line number in that cell, the timestamp, an offset from the start, and the text of the current line whenever a cell is executed

3. record_execution(), which identifies which cell, the full text of the cell, the timestamp, and an offset

4. show_log() which opens up the comma separated log file so I could copy and paste it elsewhere.
    should also be shown on stop_recording().


     Jupyter Authoring Extension
    * add a button to the toolbar which starts recording from the camera and microphone
    * Once recording has started, the logging should be started as well.
        A stop button should be rendered on the toolbar.
    * Once stop is pressed the user should be asked for an email address and then automatically
        upload everything to the flask page you setup (do I need selenium for this?)
        * can send a request directly to API (might need to setup a new route to handle this)
*/

define([
    'jquery',
    'base/js/namespace',
    'require',
    'contents',
    'base/js/dialog',
    'base/js/i18n',
    'base/js/utils',
    './module/helperFuncs',
    './external/RecordRTC'
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

    let startTime = 0;

    let isRecording = false;

    let recorder = null;

    let recordingBlob = null;

    let logFile = [];

    let lastEvent = 0;

    let mistakeNumber = 0;

    let mediaStream = null;

    let recordingName = '';

    // get sound from files
    let startSound = new Audio('../nbextensions/recordingStart.wav');

    function timeFromPrevious(eventTime) {
        // helper function for calculating time from the last event
        let diff = eventTime - lastEvent;

        lastEvent = eventTime;

        return diff;
    }

    function logInfo(data) {
        // helper function for logging
        // need to add timestamp, offset-from-start, offset-from-previous
        let timestamp = Date.now();
        data['from_start'] = timestamp - startTime;
        data['from_previous'] = timeFromPrevious(timestamp);

        console.log(data);
        // add data to logFile
        logFile.push(JSON.stringify(data, null, "\t"));
    }

    function getCellIndex(cell_id) {
        // Helper function that returns the index of a cell
        let cellIndex = -1;

            // find out which cell was executed
            for (let i = 0; i < Jupyter.notebook.get_cells().length; ++i) {
                // use the cell_id field of data.cell
                if (cell_id === Jupyter.notebook.get_cell(i).cell_id) {
                    cellIndex = i;
                    break;
                }
            }
        return cellIndex;
    }


    function startRecording() {
        // start recording
        // Grab the starting time and set startTime

        let recordVideo = true;
        let recordingType = 'video'

        if ($('#recordAudio').is(":checked")) {
            console.log('webcam recording selected')
            recordVideo = false;
            recordingType = 'audio'
        }

        // start audio/webcam recording
        navigator.mediaDevices.getUserMedia({
            video: recordVideo,
            audio: true
        }).then(async function(stream) {
            recorder = window.RecordRTC(stream, {
                type: recordingType
            });
            recorder.startRecording();

            startTime = Date.now();
            lastEvent = startTime;
            isRecording = true;

            mistakeNumber = 0;
            
            // empty log file
            logFile = [];

            logInfo({
                    'type': 'start',
                    'email': '',
                    'timestamp': "Started Recording at " + new Date(startTime)}
                );

            // hide record button
            $('#record-btn').toggle();

            // show stop recording button
            $('#stop-recording-btn').toggle()


            startSound.play();

            mediaStream = stream;
        });
    }

    function stopRecording() {
        // Function that stops recording
        // end recording and print out log
        // print out current timestamp and difference between start recording time and current time
        isRecording = false;
        let endTime = Date.now();

        //change symbol of record button to play and make background white
        $('#record-btn').toggle();
        $('#stop-recording-btn').toggle();

        logInfo({
            'type': 'end',
            "timestamp": "Ended recording at " + new Date(endTime),
            "total recording time": helpers.msToTime(Math.floor(endTime - startTime))
        });
        
        // call downloadLog
        //downloadLogFile();

        // stop recording and create blob
        recorder.stopRecording(function() {
            recordingBlob = recorder.getBlob();
        })

        // close the recording stream
        mediaStream.getTracks().forEach(track => track.stop());

        stopRecordingDialog();
    }

    function recordLine(e) {
        /* Logs:
                * current cell number
                * current line number in that cell
                * text of the current line
                * timestamp
                * offset from the start
        */

        // need to bind it to down arrow
        // if on last line of cell, then execute cell and move to the next one if there is one
        if (isRecording && Jupyter.notebook.mode === "edit") {
            // grab the currently selected cell
            let cell = Jupyter.notebook.get_selected_cell();

            let cursorInfo = cell.code_mirror.getCursor();

            // get the current line number
            let lineNumber = cursorInfo.line;

            // get the line text
            let lineText = cell.code_mirror.doc.getLine(lineNumber);

            let infoToLog = {
                        'type': 'Line',
                        'cell index': getCellIndex(cell.cell_id),
                        'cell type': cell.cell_type,
                        'line number': lineNumber + 1,
                        'line text': lineText,
                        'move cursor': false,
                        'next cell': false
                        }

            // if on last line, then execute cell and move to next cell
            // need to check if at end of line
            if ((lineNumber + 1) === cell.code_mirror.lineCount()) {
                if (cell.code_mirror.getLine(lineNumber).length !== cursorInfo.ch) {
                    // set cursor to end of line
                    let newCursor = {line: lineNumber, ch: cell.code_mirror.getLine(lineNumber).length};
                    cell.code_mirror.setCursor(newCursor);

                    // append tag to infoToLog that the cursor was put to end of line
                    infoToLog["move cursor"] = true;
                    logInfo(infoToLog);
                }
                else {
                    infoToLog["next cell"] = true;
                    logInfo(infoToLog);

                    // execute cell
                    cell.execute();

                    // move to next cell
                    Jupyter.notebook.select_next();

                    // enter the cell
                    Jupyter.notebook.edit_mode();

                    // set cursor to first line
                    let nextCell = Jupyter.notebook.get_selected_cell();
                    nextCell.code_mirror.setCursor({line: 0, ch: 0});

                    // scroll to the cell
                    Jupyter.notebook.scroll_to_cell(getCellIndex(nextCell.cell_id));
                }
            }
            else {
                // move down a line
                let newCursor = {line: cursorInfo.line + 1, ch: 0};
                cell.code_mirror.setCursor(newCursor);
                logInfo(infoToLog);
            }
        }
    }

    function recordMistake() {
        // makes a note when there is a mistake
        if (isRecording) {
            // increment mistake number
            mistakeNumber++;

            logInfo({
                'type': 'annotation',
                'annotation number': mistakeNumber
            });
        }
    }

    function recordExecution() {
        // watch for execution of code cells
        Jupyter.notebook.events.on('execute.CodeCell', (evt, data) => {
            /*
                data contains the following:
                    cell: CodeCell object
            */
            if (isRecording) {
                let cellIndex = getCellIndex(data.cell.cell_id);

                let timestamp = Date.now();

                logInfo({
                    'type': 'Execution',
                    'cell index': cellIndex
                    //'cell text': data.cell.get_text()
                });
            }
        });
    }

    function recordRender() {
        // watch for render event
        Jupyter.notebook.events.on('rendered.MarkdownCell', (evt, data) => {
            /*
                data contains the following:
                    cell: MarkdownCell
            */
           if (isRecording) {
               let cellIndex = getCellIndex(data.cell.cell_id);
               let timestamp = Date.now();

               logInfo({
                'type': 'Render',
                'cell index': cellIndex,
                'cell text': data.cell.get_text()
            });
           }
        });
    }

    function download(filename, text) {
        // From https://stackoverflow.com/questions/45831191/generate-and-download-file-from-js
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element)
    }

    function downloadBlob(fileName) {
        
        // create link and click it to automatically download webm file
        let a = document.createElement("a");
        let url = URL.createObjectURL(recordingBlob);
        a.setAttribute('href', url);
        a.setAttribute('download', fileName + ".webm");
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadFiles(fileName) {
        // download log file and audio file
        downloadLogFile(fileName);
        downloadBlob(fileName);
    }

    function downloadLogFile(fileName) {
        // Downloads the log file when the button is clicked or when done recording

        // get date and time for the filename
        // let newDate = new Date();
        // let timestamp = parseInt(newDate.getMonth()+1) + '-' + newDate.getDate() + '-' + newDate.getFullYear() + '-' + newDate.getHours() + '_' + newDate.getMinutes();

        if (logFile.length !== 0) {
            download(fileName + '.txt', logFile);
        }
    }

    function toggleButtons() {
        // Toggles the visibility of the toolbar buttons
        $('#record-btn').toggle();
        $('#download-log-btn').toggle();
    }

    function startRecordingDialog() {

        let form = $('<form>').attr('id', 'recordingOptions').attr('onSubmit', 'return false');
        form.append("<input id='recordAudio' type='radio' name='recordingOption' > Record Audio Only </input>");

        form.append("<br>");

        form.append("<input id='recordVideo' type='radio' name='recordingOption' checked > Record Webcam and Audio</input>");

        dialog.modal({
            title: i18n.msg._('Recording Options'),
            body: form,
            buttons: {
                'Start Recording' : {
                    'id': 'start-button',
                    'class': 'btn-primary', 'click': function() {
                        startRecording();
                    }
                },
                'Cancel': {
                    'class': 'btn-default',
                    'click': function() {
                        console.log('cancelled upload');
                    }
                }
            },
            keyboard_manager: Jupyter.keyboard_manager
        }).on('shown.bs.modal', function() {
            // set focus to input box when dialog box is opened
            setTimeout(function () {
                // set timeout of 10 ms because Jupyter dialog modal sets the focus to cancel button first
                $('#start-button').focus();
                //document.getElementById('logFile').addEventListener('change', onFileSelected, false);
                //document.getElementById('audioFile').addEventListener('change', onAudioSelected, false);
            }, 10);
        }).keypress(function (e) {
            if (e.which === 13) {
                // 13 is the code for enter
                // need to activate the Join button
                // click join-button
                $('#start-button').click();
            }
        });
    }

    function stopRecordingDialog() {
        let formDiv = $('<div></div>');
        let form = $('<form>Name of Recording (.mp4 will be added to end): </form>').attr('id', 'recordingOptions').attr('onSubmit', 'return false');
        form.append("<input id='recordingName' class='textInput' type='text' required />");

        form.append('<br> <br>')

        form.append("<h4>UPLOAD ENVZIP OR SUBMIT GITHUB URL. IF BOTH ARE GIVEN, ENVZIP WILL OVERRIDE GITHUB</h4> <br>")

        form.append("<label class='fileLabel' for='envZip'> Optional Environment Zip File: </label> <span class='fileSpan'> <input name='envZip' id='envZip' type='file' accept='.zip, .tar, .tar.gz, .gz' /> </span> <br>");

        form.append("<div>Optional GitHub URL: <input id='githubUrl' class='textInput' type='url'/></div> <br>")

        form.append("<div>Optional Repo Path: <input id='repoPath' class='textInput' type='text'/></div> <br>")

        form.append("<label class='fileLabel' for='configScript'> Optional Config Script: </label> <span class='fileSpan'> <input name='configScript' id='configScript' type='file' accept='.py' /> </span> <br>")

        form.append("<div>Email Address: <input id='emailAddress' class='textInput' type='email' required /></div> <br>");

        formDiv.append(form);

        let selectDiv = $('<div> Typing Option: </div>');
        let select = $('<select name="typingOptions" form="recordingOptions" id="typingOptions"></select>');
        select.append('<option value="letter" selected>Letter by Letter (With Comments)</option>');
        select.append('<option value="line">Line by Line (With Comments)</option>');
        select.append('<option value="noComments">Code Letter by Letter (No Comments)</option>');

        selectDiv.append(select);

        formDiv.append(selectDiv);
        
        dialog.modal({
            title: i18n.msg._('Recording Has Finished'),
            body: formDiv,
            buttons: {
                'Create Code Playback Video' : {
                    'id': 'upload-button',
                    'class': 'btn-primary',
                    'click': function(evt) {
                        // check if name and email are entered
                        if ($('#recordingName').val() === '') {
                            // add red border around input box
                            $('#recordingName').css('border', '1px solid #ff0000')
                            $('#recordingName').after('<p style="color:red;" id = "name-required">Name required</p>');

                            return false;
                        }

                        if ($('#emailAddress').val() === '') {
                            // add red border around input box
                            $('#emailAddress').css('border', '1px solid #ff0000')
                            $('#emailAddress').after('<p style="color:red;" id = "email-required">Email required</p>');

                            return false;
                        }

                        // upload files
                        processUploadFiles();
                    }
                },
                'Download Files': {
                    'id': 'download-btn',
                    'class': 'btn-default',
                    'click': function(evt) {
                        // check if name is provided
                        if ($('#recordingName').val() === '') {
                            // add red border around input box
                            $('#recordingName').css('border', '1px solid #ff0000')
                            $('#recordingName').after('<p style="color:red;" id = "name-required">Name required</p>');

                            return false;
                        }

                        downloadFiles($('#recordingName').val());

                        // return false to prevent closing of dialog
                        return false;
                    }
                },
                'Delete Recording': {
                    'class': 'btn-danger',
                    'click': function() {
                        console.log('cancelled upload');
                    }
                }
            },
            keyboard_manager: Jupyter.keyboard_manager
        }).on('shown.bs.modal', function() {
            // set focus to input box when dialog box is opened
            setTimeout(function () {
                // set timeout of 10 ms because Jupyter dialog modal sets the focus to cancel button first
                $('#upload-button').focus();

                // prevent spaces in file name
                $('#recordingName').on('keypress', function(e) {
                    if (e.which == 32) {
                        return false;
                    }
                });
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

    function successDialog() {

        $('#uploadingFilesGif').hide();

        let successMsg = $("<div> Your recording has been started. Check your email for status updates and eventually a link to your video. </div>")

        dialog.modal({
            title: i18n.msg._('Playback Request has been Sent to the Server'),
            body: successMsg,
            buttons: {
                'Ok': {
                    'id': 'ok-btn',
                    'class': 'btn-default'
                }
            },
            keyboard_manager: Jupyter.keyboard_manager
        }).keypress(function (e) {
            if (e.which === 13) {
                // 13 is the code for enter
                // need to activate the Join button
                // click join-button
                $('#ok-btn').click();
            }
        });
    }

    function errorDialog(msg) {
        $('#uploadingFilesGif').hide();

        let errorMsg = $('<div>' + msg  + '</div>');

        dialog.modal({
            title: i18n.msg._('Error Uploading Media File and Log File to Server'),
            body: errorMsg,
            buttons: {
                'Retry Upload': {
                    'id': 'retry-btn',
                    'class': 'btn-primary',
                    'click': function(evt) {

                        // upload files
                        processUploadFiles();
                    }
                },
                'Download Files': {
                    'id': 'download-btn',
                    'class': 'btn-default',
                    'click': function(evt) {
                        downloadFiles(recordingName);

                        // return false to prevent closing of dialog modal
                        return false;
                    }
                },
                'Delete Recording' : {
                    'class': 'btn-danger'
                }
            },
            keyboard_manager: Jupyter.keyboard_manager
        }).keypress(function (e) {
            if (e.which === 13) {
                // 13 is the code for enter
                // need to activate the Join button
                // click join-button
                $('#retry-btn').click();
            }
        });
    }

    function processUploadFiles() {
        // Function that processes files to upload
        // Then sends the files to the API backend

        // add loading gif to html
        $('body').append("<div id='uploadingFilesGif'></div>")

        recordingName = $('#recordingName').val();

        let formData = new FormData();

        // create log file
        let logFileBlob = new Blob([logFile], { type: 'plain/text' });
        formData.append('logFiles[0]', logFileBlob, recordingName + '.txt');
        
        formData.append('audioFiles[0]', recordingBlob, recordingName + '.webm');

        formData.append('envZips[0]', $('#envZip')[0].files[0]);
        formData.append('github[0]', $('#githubUrl').val())
        formData.append('paths[0]', $('#repoPath').val())
        formData.append('typingOptions[0]', $('#typingOptions').val());
        formData.append('numRequests', 1);
        formData.append('email', $('#emailAddress').val());
        formData.append('configScripts[0]', $('#configScript')[0].files[0])

        // send formData to API backend
        $.ajax({
            url: 'http://54.172.69.71/api/processRequests',
            data: formData,
            processData: false,
            contentType: false,
            type: 'POST',
            success: function(response) {
                $('#uploadingFilesGif').hide();
                successDialog();
            },
            error: function(jqXHR, exception) {
                $('#uploadingFilesGif').hide();
                errorDialog(jqXHR.responseText)
            }
        });
    }

    function load_ipython_extension(){
        // set up link to css file
        let link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = require.toUrl('./jupyter_authoring.css');
        document.getElementsByTagName("head")[0].appendChild(link);

        // // add shortcut for startRecording to Ctrl + B
        // Jupyter.keyboard_manager.command_shortcuts.add_shortcut('Ctrl-b', startStopRecording);
        // Jupyter.keyboard_manager.edit_shortcuts.add_shortcut('Ctrl-b', startStopRecording);

        // add shortcut for recording codemirror line to down arrow (40)
        Jupyter.keyboard_manager.edit_shortcuts.add_shortcut('Ctrl-j', recordLine);
        //$(document).keydown(recordLine);

        // add shortcut for hiding buttons
        Jupyter.keyboard_manager.edit_shortcuts.add_shortcut('Ctrl-shift-k', toggleButtons);
        Jupyter.keyboard_manager.command_shortcuts.add_shortcut('Ctrl-shift-k', toggleButtons);

        // // add shortcut for downloading log
        // Jupyter.keyboard_manager.edit_shortcuts.add_shortcut("Ctrl-shift-'", downloadLogFile);
        // Jupyter.keyboard_manager.command_shortcuts.add_shortcut("Ctrl-shift-'", downloadLogFile);

        // // add shortcut for mistake key
        // Jupyter.keyboard_manager.edit_shortcuts.add_shortcut("Ctrl-shift-a", recordMistake);
        // Jupyter.keyboard_manager.command_shortcuts.add_shortcut("Ctrl-shift-a", recordMistake);

        // call function to record execution when recording
        recordExecution();

        // function to record rendered markdown
        recordRender();

        // add record button
        Jupyter.toolbar.add_buttons_group([{
            label: 'Record',
            icon: 'fa-circle',
            id: 'record-btn',
            callback: startRecordingDialog
        }]);

        Jupyter.toolbar.add_buttons_group([{
            label: 'Stop',
            icon: 'fa-stop',
            id: 'stop-recording-btn',
            callback: stopRecording
        }]);

        // // add download log button
        // Jupyter.toolbar.add_buttons_group([{
        //     label: 'Download Log',
        //     icon: 'fa-download',
        //     id: 'download-log-btn',
        //     callback: downloadLogFile
        // }]);
        
        $('#stop-recording-btn').css('background-color', 'red');
        $('#stop-recording-btn').toggle();

        // hide buttons by default
        //toggleButtons();
    }
    return {
        load_ipython_extension: load_ipython_extension
    };
});