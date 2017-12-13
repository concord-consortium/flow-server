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
    this.fileWidget  = jQuery('<div>', { id: 'program-editor-file-manager',
                                        css: {  zIndex: 100,
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
        var programSpec = editor.getProgramSpec();
        var programStr = JSON.stringify(programSpec);

        console.log("Saving:", programStr);

        //
        // Call API to save program.
        //
        var url = '/ext/flow/save_program'
        var data = {    filename:   filename,
                        content:    programStr,
                        csrf_token: g_csrfToken };

        $.ajax({
            url:        url,
            method:     'POST',
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
        var data = { filename:      filename,
                     csrf_token:    g_csrfToken     };

        $.ajax({
            url:        url,
            method:     'POST',
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

    this.fileWidget.append(nameLabel);
    this.fileWidget.append(nameField);
    this.fileWidget.append(saveButton);
    this.fileWidget.append(deleteButton);
    this.fileWidget.append(exitButton);

    container.append(this.fileWidget);

    //
    // Get name of program
    //
    this.getProgramName = function() { 
        console.log("[DEBUG] getProgramName() " + nameField.val());
        return nameField.val(); 
    };

    //
    // Hide this widget
    //
    // this.hide = function() {
    //    console.log("[DEBUG] hiding file manager.");
    //    this.fileWidget.hide();
    // };

    //
    // Show this widget
    //
    // this.show = function() {
    //    console.log("[DEBUG] showing file manager.");
    //    this.fileWidget.show();
    // };

    return this;
}
