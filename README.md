# Flow-Server

_This material is based upon work supported by the National Science Foundation under Grant No. DRL-1640054. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the National Science Foundation._

Developed by the Concord Consortium in collaboration with Manylabs, flow system lets people create data
flow diagrams that interface with sensors and actuators. This repository contains the user interface for
viewing and editing data flow diagrams and for viewing recorded data. The flow diagrams are executed on a
remote computer (e.g. Raspberry Pi) using the [flow](https://github.com/manylabs/flow) program.

The flow web app (flow user interface) sends messages to the flow program using a websocket connection.
The server runs the [rhizo-server](https://github.com/rhizolab/rhizo-server), which receives the messages
and passes them along to the flow program (which receives the messages via the
[rhizo](https://github.com/rhizolab/rhizo) client library).

The web app consists of five screens/pages (currently part of a single-page app to allow embedding within
CODAP):
*   a user login screen
*   a landing page screen containing saved programs, saved datasets, and controller computers (Raspberry Pis) status info
*   a diagram editor/viewer with controls to connect to and run or stop programs on a controller computer
*   a historical dataset viewer
*   an admin screen containing a full list of controller computers and related functions

The python code included with the web app is an extension to the rhizo-server framework that manages a few
server-side flow-specific tasks, such as getting a list of available controllers and letting students select
controllers by name.

The web app itself is stored in the `static` and `templates` folders witin this repo.

## Installation

1.  Install `rhizo-server` according to the instructions in its `README.md`.
2.  Install rauth, python-jose and requests
```
    pip install rauth python-jose requests
```
3.  Create an `extensions` folder inside `rhizo-server`
4.  Create an empty `__init__.py` file inside it.
5.  Place the `flow-server` repo (this repo) inside that.
    (If everything is in the right place, you should have a `rhizo-server/extensions/flow-server/ext.py` file.)
7.  Copy `flow-server/autoload-config.sample.py` to `flow-server/autoload-config.py` and fill in private settings denoted by `***`.
    If you are running this somewhere other than production change `FIREBASE_ENVIRONMENT` from `production` to something unique, like `staging` or `dmartin`.
    If you don't want to use Firebase change `FIREBASE_ENABLED` to `False`.
8.  Start/restart the server (using `AUTOLOAD_EXTENSIONS=true python run.py -s`) and visit it's web interface.
    If you are running the server locally, visit [http://localhost:5000/](http://localhost:5000/).
9.  Log in as a system admin.
10.  Select `System` / `Organizations` / `New Organization` and create a `Testing` organization with a `testing` folder name.
11.  Click on the organization and then `Assign User` to add yourself to the new organization.

## Configure SSO Login

Optionally configure SSO login.

1. Within the `rhizo-server` directory, edit the file `settings/config.py`
2. Add or modify the following variables to point to your SSO provider
    (e.g. learn.concord.org) and specify your SSO client id and secret.

    ```
    FLOW_PORTAL_SITE = 'http://portal-sso.staging.concord.org:3000'
    FLOW_PORTAL_SSO_CLIENT_ID = 'foo'
    FLOW_PORTAL_SSO_CLIENT_SECRET = 'bar'
    ```

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
*   `params`: optional, block-specific parameters which may include: `recording_interval`, `dataset_location`, `sequence_names`, `seconds_on`, `seconds_off`, `period`

## Coding Conventions

For Javascript code we use 4 spaces for indentation and camel case.
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
