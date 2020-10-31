// TODO: text box to set max characters per line
define([
    'jquery',
    'base/js/namespace',
    'require'
], function (
    $,
    Jupyter,
    require
) {
    "use strict";

    // 108 to account for '# '
    let DEFAULTMAXCHARACTERSPERLINE = 108;

    let MAXCHARACTERSPERLINE = 108;

    // Shorten a string to less than maxLen characters without truncating words.
    // from here: https://stackoverflow.com/questions/5454235/shorten-string-without-cutting-words-in-javascript
    function shorten(str, maxLen, separator = ' ') {
        if (str.length <= maxLen) return str;
        return str.substr(0, str.lastIndexOf(separator, maxLen));
    }

    function wrapCommentBlock(comments) {
        /*
            Wraps comment blocks so the comments can be seen without scrolling right
        */

        // get the tab value of the comments
        let tabString = comments[0].split('#')[0];
        let maxChar = MAXCHARACTERSPERLINE - tabString.length;

        // remove # from each line
        // remove whitespace in front and back of each string
        for (let i = 0; i < comments.length; ++i) {
            comments[i] = comments[i].replace('#', '');
            comments[i] = comments[i].trim();
        }

        // combine comments into one string
        let commentStr = comments.join(' ');

        let fixedCommentBlock = []

        let leftPos = 0;

        // make new comment lines
        while (leftPos < commentStr.length) {
            let newLine = shorten(commentStr.substr(leftPos), maxChar);

            leftPos = leftPos + newLine.length + 1;

            // add tab length and '# '
            newLine = tabString + '# ' + newLine;
            fixedCommentBlock.push(newLine);
        }

        return fixedCommentBlock;
    }

    function wrapCellText() {
        let cellsToWrap = Jupyter.notebook.get_selected_cells();

        // get the maxChar input
        let maxCharInput = $('#maxCharInput').val();
        if (maxCharInput.trim() === '' || maxCharInput <= 0) {
            MAXCHARACTERSPERLINE = DEFAULTMAXCHARACTERSPERLINE;
        }
        else {
            MAXCHARACTERSPERLINE = $('#maxCharInput').val();
        }

        for (let k = 0; k < cellsToWrap.length; ++k) {
            if (cellsToWrap[k].cell_type === 'code') {
                wrapCodeComments(cellsToWrap[k]);
            }
            else if (cellsToWrap[k].cell_type === 'markdown') {
                wrapMarkdownCell(cellsToWrap[k]);
            }
        }
    }

    function wrapMarkdownBlock(block){
        // fix the markdown block
        let leftPos = 0;

        let fixedBlock = [];

        let blockStr = block.join(' ');

        while (leftPos < blockStr.length) {
            let newLine = shorten(blockStr.substr(leftPos), MAXCHARACTERSPERLINE);

            leftPos = leftPos + newLine.length + 1;

            fixedBlock.push(newLine);
        }

        return fixedBlock;
    }

    function wrapMarkdownCell(cell) {
        // wraps whole markdown cell
        
        // unrender cell first
        cell.unrender();

        let cellText = cell.get_text().split('\n');

        let newCellLines = [];

        // format lines as blocks
        let left = 0
        let right = 0
        for ( ; right < cellText.length && left < cellText.length; ++right) {
            // check if line is empty
            if (cellText[right].trim() == '') {
                // format block
                let newBlockLines = wrapMarkdownBlock(cellText.slice(left, right));

                for (let i = 0; i < newBlockLines.length; ++i) {
                    newCellLines.push(newBlockLines[i]);
                }

                // add empty line to newCellLines
                newCellLines.push('');

                // set leftIndex
                left = right + 1;
            }
        }

        // check if left index is equal to right
        if (left !==  right) {
            // need to format rest of cell
            let newBlockLines = wrapMarkdownBlock(cellText.slice(left));

            for (let i = 0; i < newBlockLines.length; ++i) {
                newCellLines.push(newBlockLines[i]);
            }
        }

        // set the cell text
        cell.set_text(newCellLines.join('\n'));
    }



    function wrapCodeComments(cell) {
        // wrap any lines with comments
        // need to wrap comments in bunches
        let cellLines = cell.get_text().split('\n');
        
        let newCellLines = [];

        // go through cell Lines and find multiple comments in a row
        for (let i = 0; i < cellLines.length; ) {
            // check if the line is a comment
            if (cellLines[i].trim()[0] === '#') {
                // line is a comment so keep going until a non-comment line is found
                let j = i + 1;
                for ( ; j < cellLines.length; ++j) {
                    if (cellLines[j].trim()[0] !== '#') {
                        // is not a comment, break
                        break;
                    }
                }

                let newCommentBlock = wrapCommentBlock(cellLines.slice(i, j));

                // push new comment block to newCellLines
                for (let m = 0; m < newCommentBlock.length; ++m) {
                    newCellLines.push(newCommentBlock[m])
                }

                // set i to next line
                i = j;
            }
            else {
                newCellLines.push(cellLines[i])
                i++;
            }
        }

        // reconstruct cell text
        cell.set_text(newCellLines.join('\n'))
    }

    function load_ipython_extension(){
        // add button to toolbar
        Jupyter.toolbar.add_buttons_group([{
            label: 'Wrap Comments',
            icon: 'fa-hashtag',
            id: 'wrap-comments-btn',
            callback: wrapCellText
        }]);

        // add a textbox next to the wrap comments btn
        $('#wrap-comments-btn').after("<input type='number' id='maxCharInput' style='width:50px'/>");

        // disable Jupyter keyboard on focus
        $('#maxCharInput').focus(function() {
            Jupyter.keyboard_manager.disable();
        });

        // enable Jupyter keyboard on focusout
        $('#maxCharInput').focusout(function() {
            Jupyter.keyboard_manager.enable();
        });
    }
    return {
        load_ipython_extension: load_ipython_extension
    };
});