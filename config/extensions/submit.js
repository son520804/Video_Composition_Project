/*
	General: students can submit their solution
*/

define([
    'jquery',
    'require',
    'base/js/namespace',
    'base/js/dialog',
    'base/js/i18n',
    'nbextensions/url',
    'nbextensions/getsolutions',
    'nbextensions/username',
    'nbextensions/control',
    'nbextensions/submitfunction'
], function ($,
             require,
             Jupyter,
             dialog,
             i18n,
             getUrl,
             getSolutions,
             getUsername,
             control,
             submitsub) {
    function load_ipython_extension() {
//         function getNotebookContent() {
//
//             notebookContent = {};
//             // Below it was <= earlier. Anant changed it to >=
//             if (Jupyter.notebook.get_cells().length >= 1) {
//                 notebookContent = JSON.stringify(Jupyter.notebook);
//             } else {
//                 notebookContent = {
//                     err: 'no content was found in the notebook'
//                 };
//             }
//             return notebookContent;
//         }
//
//         var handlerSubmit = function (license, nbname, description) {
//             //EFFECTS: send students information to database
//             var username_all = getUsername.getUsernameForConfig();
//             var username = "";
//             var user_id = "";
//             if (username_all == "localhost") {
//                 username = "localhost";
//                 user_id = "localhost";
//             } else {
// //                 var temp = username_all.split("_");
// //                 user_id = temp[temp.length - 1];
// //                 username = username_all.substr(0, username_all.length - user_id.length - 1);
// //                 if (username == "") {
// //                     username = user_id;
//                 username = username_all;
//                 user_id = username;
// //                 }
//             }
//
//
//             var question_id = Jupyter.notebook.get_cell(0).metadata.question_id;
//
//             var notebook_json = {
//                 "notebook_content": getNotebookContent(),
//                 "username": username,
//                 "user_id": user_id,
//                 "license": license,
//                 "nbname": nbname,
//                 "description": description
//             };
//             Jupyter.notebook.rename(nbname);
//             saveNotebookJsonToMySQLDatabase(notebook_json);
//         };
//
//         function saveNotebookJsonToMySQLDatabase(data) {
//             var api_url = "";
//             api_url = getUrl.getUrlForConfig("saveStudentFinalAns");
//             var xhr = new XMLHttpRequest();
//             xhr.open('POST', api_url, true);
//             xhr.setRequestHeader('Content-type', 'application/json');
//             xhr.send(JSON.stringify(data));
//         }
//
//         /*
//           returns: { part_id : student solution }
//         */
//         function getPartIdToStudentSolution() {
//             var partIdToSolution = {};
//             var CELLS = Jupyter.notebook.get_cells();
//             CELLS.forEach(function (CELL, i) {
//
//                 // Student solution
//                 if ("part_id" in CELL.metadata && CELL.metadata.editable) {
//                     const PART_ID = CELL.metadata.part_id;
//                     const CODE_MIRROR_TEXT = CELL.code_mirror.getValue();
//                     partIdToSolution[PART_ID] = CODE_MIRROR_TEXT;
//                 }
//             });
//             return partIdToSolution;
//         }
//
//         function dispatchSubmitSolutionEvent() {
//             const EVENT_TITLE = 'Student Submitted Solution';
//             const PART_ID_TO_SOLUTION = getPartIdToStudentSolution();
//             var submitSolutionEvent = new CustomEvent(EVENT_TITLE, {
//                 detail: {
//                     "event_title": "student submitted solutions",
//                     "time": Date.now(),
//                     "student_solutions": PART_ID_TO_SOLUTION
//                 }
//             });
//             document.dispatchEvent(submitSolutionEvent);
//         }
//
//         var oldSaveNotebook = function (check_last_modified) {
//             if (check_last_modified === undefined) {
//                 check_last_modified = true;
//             }
//
//             var error;
//             if (!Jupyter.notebook._fully_loaded) {
//                 error = new Error("Load failed, save is disabled");
//                 Jupyter.notebook.events.trigger('notebook_save_failed.Notebook', error);
//                 return Promise.reject(error);
//             } else if (!Jupyter.notebook.writable) {
//                 error = new Error("Notebook is read-only");
//                 Jupyter.notebook.events.trigger('notebook_save_failed.Notebook', error);
//                 return Promise.reject(error);
//             }
//
//             // Trigger an event before save, which allows listeners to modify
//             // the notebook as needed.
//             Jupyter.notebook.events.trigger('before_save.Notebook');
//
//             // Create a JSON model to be sent to the server.
//             var model = {
//                 type: "notebook",
//                 content: Jupyter.notebook.toJSON()
//             };
//             // time the ajax call for autosave tuning purposes.
//             var start = new Date().getTime();
//
//             var that = Jupyter.notebook;
//             var _save = function () {
//                 return that.contents.save(that.notebook_path, model).then(
//                     $.proxy(that.save_notebook_success, that, start),
//                     function (error) {
//                         that.events.trigger('notebook_save_failed.Notebook', error);
//                     }
//                 );
//             };
//
//             if (check_last_modified) {
//                 return Jupyter.notebook.contents.get(Jupyter.notebook.notebook_path, {content: false}).then(
//                     function (data) {
//                         var last_modified = new Date(data.last_modified);
//                         // We want to check last_modified (disk) > that.last_modified (our last save)
//                         // In some cases the filesystem reports an inconsistent time,
//                         // so we allow 0.5 seconds difference before complaining.
//                         if ((last_modified.getTime() - that.last_modified.getTime()) > 500) {  // 500 ms
//                             console.warn("Last saving was done on `" + that.last_modified + "`(" + that._last_modified + "), " +
//                                 "while the current file seem to have been saved on `" + data.last_modified + "`");
//                             if (that._changed_on_disk_dialog !== null) {
//                                 // update save callback on the confirmation button
//                                 that._changed_on_disk_dialog.find('.save-confirm-btn').click(_save);
//                                 // redisplay existing dialog
//                                 that._changed_on_disk_dialog.modal('show');
//                             } else {
//                                 // create new dialog
//                                 that._changed_on_disk_dialog = dialog.modal({
//                                     notebook: that,
//                                     keyboard_manager: that.keyboard_manager,
//                                     title: i18n.msg._("Notebook changed"),
//                                     body: i18n.msg._("The notebook file has changed on disk since the last time we opened or saved it. "
//                                         + "Do you want to overwrite the file on disk with the version open here, or load "
//                                         + "the version on disk (reload the page)?"),
//                                     buttons: {
//                                         Reload: {
//                                             class: 'btn-warning',
//                                             click: function () {
//                                                 window.location.reload();
//                                             }
//                                         },
//                                         Cancel: {},
//                                         Overwrite: {
//                                             class: 'btn-danger save-confirm-btn',
//                                             click: function () {
//                                                 _save();
//                                             }
//                                         },
//                                     }
//                                 });
//                             }
//                         } else {
//                             return _save();
//                         }
//                     }, function (error) {
//                         // maybe it has been deleted or renamed? Go ahead and save.
//                         return _save();
//                     }
//                 );
//             } else {
//                 return _save();
//             }
//         }


        function submitRating(difficulty, quality, comments) {
            //EFFECTS: send students' comments and rates to database
            var question_id = Jupyter.notebook.get_cell(0).metadata.question_id;
            var username_all = getUsername.getUsernameForConfig();
            var username = "";
            var user_id = "";
            if (username_all == "localhost") {
                username = "localhost";
                user_id = "localhost";
            } else {
                var temp = username_all.split("_");
                user_id = temp[temp.length - 1];
                username = username_all.substr(0, username_all.length - user_id.length - 1);
                if (username == "") {
                    username = user_id;
                }
            }
            var data = {
                "question_id": question_id,
                "student_username": username,
                "student_id": user_id,
                "difficulty_rating": parseInt(difficulty),
                "quality_rating": parseInt(quality),
                "comments": comments
            };

            var xhr = new XMLHttpRequest();
            var url = getUrl.getUrlForConfig("studentRateQuestion");
            xhr.open('POST', url, true);

            xhr.setRequestHeader('Content-type', 'application/json');

            xhr.send(JSON.stringify(data));
        }


        var submitNotebookInfo = function () {
            // create a dialog modal and let students know their answer is saved
            submitsub.oldSaveNotebook();
            var nbName = Jupyter.notebook.get_cell(0).metadata['name'];
            var description = Jupyter.notebook.get_cell(0).metadata['description'];
            var license = Jupyter.notebook.get_cell(0).metadata['license'];
            var form = $("<form></form>").attr("id", "save-form");
            form.append("<h4>Warning: this will be your final submit, once submitted you can not modify it. <br><br> Once you click the submit button, you might see a pop-up warning you that your work hasn't saved. You can ignore the pop-up and proceed.<br></h4>");
            var queryString = urlGenerator();

            // var defaultRating = 3;
            // var ratingsMap = {
            //     "difficulty-rating-star": defaultRating,
            //     "quality-rating-star": defaultRating
            // }
            //
            // var $container = $(`
			// 	<div class='container' style='width: 100%; padding: 2.5px;'>
			// 		<div class='panel panel-default'>
			// 			<div class='panel-body' id='rating-info' style="max-height: 500px; overflow-y: scroll;">
            //
			// 				<label>How Difficult Was This Question?</label>
            //
			// 				<div id='difficulty-rating' style='display: flex; font-size: 24px;'>
			// 					<div class='difficulty-rating-star star' id='difficulty-rating-star-0' style="margin: 5px;">&#9733</div>
			// 					<div class='difficulty-rating-star star' id='difficulty-rating-star-1' style="margin: 5px;">&#9733</div>
			// 					<div class='difficulty-rating-star star' id='difficulty-rating-star-2' style="margin: 5px;">&#9733</div>
			// 					<div class='difficulty-rating-star star' id='difficulty-rating-star-3' style="margin: 5px;">&#9734</div>
 			// 					<div class='difficulty-rating-star star' id='difficulty-rating-star-4' style="margin: 5px;">&#9734</div>
			// 				</div>
            //
			// 				<label>What Was the Quality of This Question?</label>
            //
			// 				<div id='quality-rating' style='display: flex; font-size: 24px;'>
			// 					<div class='quality-rating-star star' id='quality-rating-star-0' style="margin: 5px;">&#9733</div>
			// 					<div class='quality-rating-star star' id='quality-rating-star-1' style="margin: 5px;">&#9733</div>
			// 					<div class='quality-rating-star star' id='quality-rating-star-2' style="margin: 5px;">&#9733</div>
			// 					<div class='quality-rating-star star' id='quality-rating-star-3' style="margin: 5px;">&#9734</div>
			// 					<div class='quality-rating-star star' id='quality-rating-star-4' style="margin: 5px;">&#9734</div>
			// 				</div>
            //
			// 				<label>Any Comments?</label>
			// 				<div>
			// 					<textarea rows='5' style='max-width: 100%; width: 100%' id='comments' placeholder = 'Your Thoughts…'/>
			// 				</div>
            //
			// 			</div>
			// 		</div>
			// 	</div>
			// `);
            //
            // $('body').on('click', '.star', function (event) {
            //     var starId = event.target.id;
            //     var starNumber = parseInt(starId.substring(starId.length - 1, starId.length));
            //     var starType = starId.substring(0, starId.length - 2);
            //     var filledStar = "&#9733";
            //     var unfilledStar = "&#9734";
            //     var numStars = 5;
            //
            //     // Fill in first X stars
            //     var i = 0;
            //     for (; i <= starNumber; i++) {
            //         var targetStarId = starType + "-" + i.toString();
            //         $("#" + targetStarId).html(filledStar);
            //     }
            //
            //     // Make rest of stars empty
            //     for (; i < numStars; i++) {
            //         var targetStarId = starType + "-" + i.toString();
            //         $("#" + targetStarId).html(unfilledStar);
            //     }
            //
            //     ratingsMap[starType] = starNumber + 1;
            //     console.log(ratingsMap);
            // });
            //
            // form.append($container);


            function encodeQueryData(data) {
                let paramResult = encodeURIComponent('user') + '=' + encodeURIComponent(data['user']);
                return paramResult;
            }


            function urlGenerator(){
                // get the values from the form
                const currentQueryString = window.location.search;
                let urlParams = new URLSearchParams(currentQueryString); //This doesn't work on IE
                let userid = urlParams.get('id');

                const data = {'user': userid};

                return encodeQueryData(data)

            }

            function switchPage(queryString) {
                // // get the values from the form
                // const currentQueryString = window.location.search;
                // let urlParams = new URLSearchParams(currentQueryString); //This doesn't work on IE
                // let userid = urlParams.get('id');
                //
                // const data = {'user': userid}
                //
                // const queryString = encodeQueryData(data)

                // let url = 'http://localhost:8000/'
                let url = 'https://umich.qualtrics.com/jfe/form/SV_1KPMxz46OuSiPTT'

                // build url
                url += '?' + queryString
                window.location = url
            }




            dialog.modal({
                title: i18n.msg._('Submit Your Final Solution'),
                body: form,
                buttons: {
                    'Submit': {
                        'class': 'btn-primary', 'click': function () {
                            submitsub.dispatchSubmitSolutionEvent();
                            Jupyter.notebook.get_cell(0).metadata.submit = "submit";
                            submitsub.oldSaveNotebook();
//                             var difficulty = ratingsMap['difficulty-rating-star'];
//                             var quality = ratingsMap['quality-rating-star'];
//                             var comments = $("#comments").val();
//                             submitRating(difficulty, quality, comments);
                            $($('#save-notbook').children()[0]).prop('disabled', true);
                            $('#submit-solution').attr('disabled', 'disabled');
                            $('#submit-solution').hide();

                            // For now, we are not using the show answer buttons.
                            // We will keep them hidden, but programmatically click on
                            // all of them to reveal all answers at once.
                            // $('.part-answer-button').show();
                            // $('.part-answer-button').click();
                            $.when(getSolutions.insertSolutionCells())
                                .then(() => {
                                    return submitsub.handlerSubmit(license, nbName, description);
                                })
                                .then(() => {
                                    console.log('success');
                                    switchPage(queryString);
                                })
                                .catch( (error) => {
                                    console.log(error);
                                })

                        }
                    },
                    'Cancel': {
                        'class': 'btn-default', 'click': function () {
                            console.log("cancel");
                        }
                    }
                },
                notebook: Jupyter.notebook,
                keyboard_manager: Jupyter.keyboard_manager
            });


        };


        /////

        var umich_metadata = IPython.notebook.metadata.umich;
        var umich_metadata_submit = umich_metadata.submit;

        if (umich_metadata_submit === "yes") {

            Jupyter.toolbar.add_buttons_group([{
                label: 'Submit My Solution',
                icon: 'fas fa-paper-plane',
                id: 'submit-solution',
                callback: submitNotebookInfo//handlerSubmit
            }]);
        };
        $("#submit-solution").css({"background-color": "rgb(42, 115, 204)", "color": "white"});

    }

    var nb_content = JSON.parse(JSON.stringify(Jupyter.notebook));

    var ifEnable = control.getExtensionList();

    if (nb_content.cells[0].metadata.submit != "submit" && ifEnable.submit == "true") {
        return {
            load_ipython_extension: load_ipython_extension
        };
    }
});
