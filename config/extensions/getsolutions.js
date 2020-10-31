/*
	General: exports function insertSolutionCells()
  Can call this from other extensions to insert solutions.
*/
define([
    'jquery',
    'require',
    'base/js/namespace',
    'base/js/dialog',
    'base/js/i18n',
    'nbextensions/url',
    'nbextensions/username'
  ], function ($,
               require,
               Jupyter,
               dialog,
               i18n,
               getUrl,
               getUsername
             ) {
  function insertSolutionCells(){
    function httpGetAsync(url, data, callback){
      var xmlr = new XMLHttpRequest();
      xmlr.onreadystatechange = function() {
        if(xmlr.readyState == 4 && xmlr.status == 200){
          callback(JSON.parse(xmlr.responseText));
        }
      };
      xmlr.open('POST', url , true);
      xmlr.setRequestHeader('Content-type', 'application/json');
      xmlr.setRequestHeader('Access-Control-Allow-Methods', 'Post', 'Options');
      xmlr.setRequestHeader('Access-Control-Allow-Origin','*');
      xmlr.setRequestHeader('Access-Control-Allow-Headers', 'Content-Type');
      xmlr.send(JSON.stringify(data));
    }

    function insertSolutionsHelper(partIdToSolution) {
      console.log(partIdToSolution);
      var skipPartIds = new Set([]);
      var numCells = Jupyter.notebook.get_cells().length;
      for (var i = numCells - 1; i >= 0; i--) {
        var metadata = Jupyter.notebook.get_cell(i).metadata;
        if ("mentor_academy_cell_type" in metadata) {
          if (metadata.mentor_academy_cell_type == "part_student_solution_code" &&
              !skipPartIds.has(metadata.part_id)) {
            var partId = metadata.part_id;
            if (partId in partIdToSolution) {
              var insertIndex = i + 1;

              // Insert Solution Code
              var solution = partIdToSolution[partId];
              Jupyter.notebook.insert_cell_at_index("code", insertIndex);
              var cell = Jupyter.notebook.get_cell(insertIndex);
              cell.code_mirror.doc.setValue(solution);
              cell.metadata = {"part_id": partId,
                                   "editable": false,
                                   "isAnswer": true,
                                   "mentor_academy_cell_type":
                                   "part_sample_solution_code"};
              $($("#notebook-container").children()[insertIndex]).css("background-color", "yellowgreen");
            }
          } else if (metadata.mentor_academy_cell_type == "part_sample_solution_code") {
            skipPartIds.add(metadata.part_id);
            var insertIndex = i;
            $($("#notebook-container").children()[insertIndex]).css("background-color", "yellowgreen");
          }
        }
      }
    }
    function insertSolutions() {
      function getQuestionId(){
        // FIXME: make robust to cell movements
        var questionId = Jupyter.notebook.get_cell(0).metadata.question_id;
        return questionId;
      }
      var questionId = getQuestionId();
      var data = {question_id : questionId};
      var url = getUrl.getUrlForConfig("getSolutions");
      httpGetAsync(url, data, insertSolutionsHelper);
    }
    insertSolutions();
  }
	if (IPython.notebook.metadata.umich.submit === "yes") {
        return {
            insertSolutionCells: insertSolutionCells
        };
    }
});
