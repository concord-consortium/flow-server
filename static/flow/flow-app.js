// This file provide top-level control for the data flow app.


// initialize the app
function initFlowApp() {
	initControllerSelector();
}


// change screens within the app: show the controller selection screen
function showControllerSelector() {
	initControllerSelector();
	$('#controllerSelectorPanel').show();
	$('#controllerViewerPanel').hide();
	$('#diagramEditorPanel').hide();
	$('#plotterPanel').hide();
}


// change screens within the app: show the controller contents (diagram list) screen
function showControllerViewer() {
	initControllerViewer();
	$('#controllerSelectorPanel').hide();
	$('#controllerViewerPanel').show();
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
