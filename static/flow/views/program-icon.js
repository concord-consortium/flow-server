//
// Represents program metadata (filename, author)
//
var ProgramIcon = function(options) {

    var item        = options.item;
    var container   = options.container;

    // console.log("[DEBUG] ProgramIcon creating... ", filename);

    var box = jQuery('<div>', 
                        { class: 'square-button color-my-programs-icon',
                            css: { margin: '0 auto' } } );

    var text = jQuery('<div>', 
                        {   css: {  left: '5px',
                                    top: '5px'}  } );

    text.text(item.name);
    text.appendTo(box);
    box.appendTo(container);

    //
    // Load this program when clicked.
    //
    box.click(function() {
        // console.log("[DEBUG] ProgramIcon click", filename);
        var editor = getTopLevelView('program-editor-view');
        editor.loadProgram({filename: item.name});
    });

    return this;
}

