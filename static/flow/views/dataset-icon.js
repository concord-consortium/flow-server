//
// Represents program metadata (filename, author)
//
var DatasetIcon = function(options) {

    var item        = options.item;
    var container   = options.container;

    // console.log("[DEBUG] DatasetIcon dataset ... ", item);

    var box = jQuery('<div>', 
                        { class: 'square-button color-recording-now-icon',
                            css: { margin: '0 auto' } } );

    var text = jQuery('<div>', 
                        {   css: {  left: '5px',
                                    top: '5px'}  } );

    text.text(item.name);
    text.appendTo(box);
    box.appendTo(container);

    //
    // Load this dataset when clicked.
    //
    box.click(function() {
        // console.log("[DEBUG] ProgramIcon click", filename);
        var editor = getTopLevelView('program-editor-view');
        editor.loadProgram({filename: filename});
    });

    return this;
}

