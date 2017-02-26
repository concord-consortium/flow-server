// This file is used to send data to Concord's CODAP system; it is preliminary code based on a sample from Concord.


// initialize a codapInterface object
function initCodapBridge() {
	codapInterface.init({
		name: 'DataFlow',
		title: 'Data Flow',
		dimensions: {width: 900, height: 600},
		version: '0.1'
	}).then(function () {
		// Determine if CODAP already has the Data Context we need.
		// If not, create it.
		return codapInterface.sendRequest({
			action:'get',
			resource: 'dataContext[Flow_Data]'
		}, function (iResult, iRequest) {
			if (iResult && !iResult.success) {
				codapInterface.sendRequest({
					action: 'create',
					resource: 'dataContext',
					values: {
						name: "Flow_Data",
						collections: [  // There are two collections: a parent and a child
							{
								name: 'samples',
								// The parent collection has just one attribute
								attrs: [ {name: "sample", type: 'categorical'}],
								childAttrName: "sample"
							},
							{
								name: 'numbers',
								parent: 'samples',
								labels: {
									pluralCase: "numbers",
									setOfCasesWithArticle: "a sample"
								},
								// The child collection also has just one attribute
								attrs: [{name: "number", type: 'numeric', precision: 1}]
							}
						]
					}});
				}
			}
		);
	});
}


// This object handles the semantics of the page.
var CodapTest = {
	state: codapInterface.getInteractiveState(),

	// Here is the function that is triggered when the user presses the button
	sendSequence: function (values) {

		// we assume the connection should have been made by the time a button is
		// pressed.
		if(codapInterface.connectionState !== 'active') {
			alert("not running in codap");
			return;
		}

		// This function is called once the parent case is opened
		var sendData = function( iResult ) {
			var tID = iResult.values[0].id;
			for (var i = 0; i < values.length; i++) {  // fix(soon): is it ok to just call these in rapid succession? should wait until each one is done before sending next?
				codapInterface.sendRequest({
					action: 'create',
					resource: 'collection[numbers].case',
					values: {
						parent: tID,
						values: {number: values[i]}
					}
				});
			}
		};

		// We keep track of the sampleNumber in interactiveState. If it doesn't exist
		// yet, create it.
		if (this.state.sampleNumber === undefined || this.state.sampleNumber === null) {
			this.state.sampleNumber = 0;
		}

		// increment sample number.
		this.state.sampleNumber++;

		// Tell CODAP to open a parent case and call sendData when done
		codapInterface.sendRequest( {
			action: 'create',
			resource: 'collection[samples].case',
			values: {values: {sample: this.state.sampleNumber}}
		}).then(sendData);
	}
};
