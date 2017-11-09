//
// Represents program metadata (filename, author)
//
var DataSetIcon = function(options) {

    this.item       = options.item;
    this.container  = options.container;

    // console.log("[DEBUG] DataSetIcon dataset ... ", this.item);
    
    cls = "color-recorded-previous-icon";
    if(this.item.metadata && this.item.metadata.recording) {
        cls = "color-recording-now-icon";
    }

    var box = jQuery('<div>', 
                        { class: 'square-button ' + cls,
                            css: { margin: '0 auto' } } );

    var text = jQuery('<div>', 
                        {   css: {  left: '5px',
                                    top: '5px'}  } );

    text.text(this.item.name);
    text.appendTo(box);
    box.appendTo(container);

    //
    // Load this dataset when clicked.
    //
    box.click(this.item, function(e) {
        console.log("[DEBUG] DataSetIcon click", e.data);
        var dataSetView = getTopLevelView('data-set-view');
        dataSetView.loadDataSet(e.data);
        showTopLevelView('data-set-view');
    });

    return this;
}

