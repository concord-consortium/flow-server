# Flow-Server

The Manylabs flow system lets people create data flow diagrams that interface with sensors and actuators.

The system is currently under construction. We'll provide more documentation as we progress on the project.

## Installation

1.  Install `rhizo-server` according to the instructions in its `README.md`.
2.  Create an `extensions` folder inside `rhizo-server`
3.  Create an empty `__init__.py` file inside it.
4.  Place the `flow-server` repo (this repo) inside that.
    (If everything is in the right place, you should have a `rhizo-server/extensions/flow-server/ext.py` file.)
5.  In `rhizo-server/settings/config.py` change the `EXTENSIONS = []` line to `EXTENSIONS = ['flow-server']`.
6.  Start/restart the server and visit it's web interface.
7.  Log in as a system admin.
8.  Select `System` / `Organizations` / `New Organization` and create a `flow-test` organization.
9.  Set up a controller using the instructions in the `flow` repo.
10. Visit the `/ext/flow` URL on the server.

## Data Flow Diagram Structure

A flow diagram consists of a collection of blocks and connections between those blocks.
Each block has the following attributes:

*   `id`: a system-assigned ID for each block (unique within a diagram)
*   `name`: a system-assigned by potentially user-edited name for a block; this is what the user sees in the 
*   `type`: sensor type, actuator type, filter type, and various virtual/UI types
*   `units`: this provides the units (e.g. degrees C) for the value of the block; this is purely informational currently
*   `value`: the current value of the block (the value displayed); null/none if not defined (e.g. inputs disconnected);
    currently on the javascript side we represent numeric values as strings, so that all of the decimal point logic is on the controller
*   `has_seq`: true if the block has a sequence (time series) stored on the server
*   `input_count`: the number of input slots/pins for a block; generally all inputs must be connected for a block to have a vluae
*   `output_count`: the number of output slots/pins for a block; generally this will be 0 or 1
*   `input_type`/`output_type`: input and output data types: `b` for bool, `n` for number, `i` image

## Coding Conventions

For Javascript code we use tabs (with indentation of 4) and camel case.
For Python code we aim to mostly use PEP8 conventions.
All data passed via the network (include messages and diagram specs) use underscores rather than camel case.
Typically we use two blank lines between top-level code blocks (in both JS and Python) and have one blank line at the end of each file.
Section headings in code should be all caps and use eight dashes on each side.
Every function in a Javascript or Python file should have a comment of some kind (HTML files can be exempt).

## Testing Activities

*   create new diagram
*   save diagram
*   load diagram
*   create new diagram after load
*   connect number entry block
*   connect plot block
*   send data to CODAP
*   view history plot
*   close history plot and view a different one
*   plug in sensors
*   unplug sensors
*   replug sensors
*   plug in relay
*   create diagram that controls relay
