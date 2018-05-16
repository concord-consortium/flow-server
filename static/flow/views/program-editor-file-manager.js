//
// A file manager for the program editor.
// UI to display file, save, delete, exit, etc.
//
var ProgramEditorFileManager = function(options) {

    var container   = options.container;
    var editor      = options.editor;

    //
    // create a menu section
    //  
    var createSection = function(name, content) {
        
        var div = $('<div>', {class: 'diagramMenu'});
        var header = $('<div>', {class: 'diagramMenuHeader'} );
        var title = $('<div>', {class: 'diagramMenuTitle noSelect'} ).text(name);
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-chevron-down'} );
        
        if(name == 'program'){
            header.addClass('concordblue');
        }
        else{
            header.addClass('concordlightblue');
        }

        header.click( function(e) {
            if(content.is(":visible")) {
                chevron.removeClass('glyphicon-chevron-down');
                chevron.addClass('glyphicon-chevron-right');
                content.hide();
            } else {
                chevron.removeClass('glyphicon-chevron-right');
                chevron.addClass('glyphicon-chevron-down');
                content.show();
            }
        });
        div.append(header); 
        header.append(title); 
        header.append(chevron); 
        div.append(content);

        return div;
    }
    
    //
    // Program: enter program name, save, delete
    //
    var programContent = $('<div>');
    
    var programNameMenuEntry = $('<div>', {class: 'diagramMenuHeaderNoSelect noSelect menulightgray', css:{height:'60px'}} );
    var title = $('<div>', {class: 'diagramMenuEntryNoSelect noSelect'} ).text("program name");
    var programNameField = jQuery('<input>', {  
                                                id: 'program-editor-filename',
                                                type: 'text',
                                                css: {  width: '210px',
                                                        marginLeft: '5px',
                                                        fontSize: '12px',
                                                        } });
                                                        
    programContent.append(programNameMenuEntry);
    programNameMenuEntry.append(title); 
    programNameMenuEntry.append(programNameField); 
    
    var saveButton = $('<div>', {class: 'diagramMenuHeader menudarkgray'} );
    var savetitle = $('<div>', {class: 'diagramMenuEntryWithGlyph noSelect'} ).text("save");
    var savechevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-floppy-disk', css:{color:'000000'}} );
    saveButton.append(savetitle); 
    saveButton.append(savechevron); 
    
    programContent.append(saveButton);
    
    var deleteButton = $('<div>', {class: 'diagramMenuHeader menulightgray'} );
    var deletetitle = $('<div>', {class: 'diagramMenuEntryWithGlyph noSelect'} ).text("delete");
    var deletechevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-floppy-remove', css:{color:'000000'}} );
    deleteButton.append(deletetitle); 
    deleteButton.append(deletechevron); 
    
    programContent.append(deleteButton);

    var programfeatures = createSection("program", programContent);
    container.append(programfeatures);
    
    //
    // handle save button click event
    //
    saveButton.click( function() {
                           
        var filename = jQuery('#program-editor-filename').val();
        if(filename == null || filename == "") {
            alert("Please enter a valid program name.");
            return;
        }
        
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
    // Get name of program
    //
    this.getProgramName = function() { 
        console.log("[DEBUG] getProgramName() " + programNameField.val());
        return programNameField.val(); 
    }

    return this;
}
