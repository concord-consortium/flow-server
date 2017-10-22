// This file provide top-level control for the data flow app.


// initialize the app
function initFlowApp() {
	showControllerSelector();
}


//
// Change screens within the app:
// show the controller selection screen
//
function showControllerSelector() {
    initControllerSelector();
    $('#controllerSelectorPanel').show();
    $('#controllerAdminPanel').hide();
    $('#controllerViewerPanel').hide();
    $('#diagramEditorPanel').hide();
    $('#plotterPanel').hide();
}

//
// Change screens within the app:
// show the controller contents (diagram list) screen
//
function showControllerViewer() {
    initControllerViewer();
    $('#controllerSelectorPanel').hide();
    $('#controllerViewerPanel').show();
    $('#diagramEditorPanel').hide();
    $('#plotterPanel').hide();
}

//
// Change screens within the app: 
// show the controller admin screen
//
function showAdminView() {
    initAdminView();
    $('#controllerAdminPanel').show();
    $('#controllerSelectorPanel').hide();
    $('#diagramEditorPanel').hide();
    $('#plotterPanel').hide();
}



// change screens within the app: show the flow diagram editor screen
function showDiagramEditor() {
	initDiagramEditor();
	$('#controllerSelectorPanel').hide();
	$('#controllerViewerPanel').hide();
	$('#diagramEditorPanel').show();
	$('#plotterPanel').hide();
}


// change screens within the app: show the plotter screen
function showPlotter() {
	initPlotter();
	$('#controllerSelectorPanel').hide();
	$('#controllerViewerPanel').hide();
	$('#diagramEditorPanel').hide();
	$('#plotterPanel').show();
}
