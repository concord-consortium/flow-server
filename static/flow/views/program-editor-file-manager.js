//
// A file manager for the program editor.
// UI to display file, save, delete, exit, etc.
//
var ProgramEditorFileManager = function(options) {

    var container   = options.container;
    var editor      = options.editor;

    //
    // Create save widget
    //
    var fileWidget  = jQuery('<div>', { css: {  zIndex: 100,
                                                backgroundColor: 'white',
                                                position: 'absolute' } });

    //
    // Label
    //
    var nameLabel   = jQuery('<label>').text('Program Name').css('padding', '2px');;

    //
    // File name field
    //
    var nameField   = jQuery('<input>').attr({  id: 'program-editor-filename', 
                                                type: 'text' });

    //
    // Save button with handler and callback
    //
    var saveButton  = jQuery('<button>').text('Save');

    saveButton.click( function() {
                           
        var filename = jQuery('#program-editor-filename').val();
        var content = jQuery('#program-content').val();

        //
        // After one use of the CSRF token in a POST
        // request, it is no longer accepted.
        // How to fix this? Pass a new one back 
        // to the client and then reset the
        // g_csrfToken value here? :(
        //
        var url = '/ext/flow/save_program'
        var data = {    filename:   filename,
                        content:    content         };
                        // csrf_token: g_csrfToken     };

        $.ajax({
            url:        url,
            method:     'GET',
            data:       data,
            success:    function(data) {
                var response = JSON.parse(data);

                console.log(
                    "[DEBUG] Save program response", 
                    response);

                if(response.success) {
                    alert("Program saved");
                } else {
                    alert("Error: " + response.message);
                }
            },
            error: function(data) {
                console.log("[ERROR] Save error", data);
                alert('Error saving program.')
            },
        });

    });


    //
    // Delete button with handler and callback
    //
    var deleteButton = jQuery('<button>').text('Delete');

    deleteButton.click( function() {
    
        var filename = jQuery('#program-editor-filename').val();

        var conf = confirm("Are you sure you want to delete " + filename + "?");

        if(!conf) {
            return;
        }

        //
        // After one use of the CSRF token in a POST
        // request, it is no longer accepted.
        // How to fix this? Pass a new one back 
        // to the client and then reset the
        // g_csrfToken value here? :(
        //
        var url = '/ext/flow/delete_program'
        var data = { filename: filename };
                        // csrf_token: g_csrfToken     };

        $.ajax({
            url:        url,
            method:     'GET',
            data:       data,
            success:    function(data) {
                var response = JSON.parse(data);

                console.log(
                    "[DEBUG] Delete program response", 
                    response);

                if(response.success) {

                    alert("Program deleted");
                    editor.resetEditor();
                    showTopLevelView('landing-page-view');

                } else {
                    alert("Error: " + response.message);
                }
            },
            error: function(data) {
                console.log("[ERROR] Delete error", data);
                alert('Error deleting program.')
            },
        });

    });

 
    //
    // Exit button
    //
    var exitButton  = jQuery('<button>').text('Exit')
                        .click( function() {
                            editor.resetEditor();
                            showTopLevelView('landing-page-view');
                        });

    fileWidget.append(nameLabel);
    fileWidget.append(nameField);
    fileWidget.append(saveButton);
    fileWidget.append(deleteButton);
    fileWidget.append(exitButton);

    container.append(fileWidget);

    //
    // Get name of program
    //
    this.getProgramName = function() { 
        console.log("[DEBUG] getProgramName() " + nameField.val());
        return nameField.val(); 
    }

    return this;
}
