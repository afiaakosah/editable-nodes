# Unit 3: Editable Nodes

## Setup  

From the `unit3` directory, you should `cd` into either `server` or `client` and then run the following commands:

### `yarn install`

Installs all of `MyHypermedia`'s dependencies.

### `touch .env`

Creates a .env file for you to set up.

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.


## Testing  
### `yarn test`

Launches the test runner in the interactive watch mode.

## Design Questions (10 pts)
The use case this web-app addresses is that of students. It gives students the ability to 
take notes in lectures, meetings, and most anything else. The features I chose to implement, 
namely strike, heading, and blockquote, address various needs for students. The strike button 
is helpful for students who create multiple drafts of papers and for when they would want to 
create non-destrctive edits to their work or the work of others when giving feedback. The 
Blockqoute feature is also very helpful as students are often quoting and pulling from the 
work of other scholars. Lastly, having headings is a great tool to organise notes, papers 
and to-do lists under different topics and/or dates. 

## Notable Design Choices
Clicking "start link" on a temporal node will create the anchor extent at the timestamp
at which you clicked "start link". 

## Deployed Backend URL

## Deployed Frontend URL

## Known Bugs
Image resizing
    - The center of the image itself moves while cropping, I tried to debug this with the 
    css settings to no avail.

Canvas View 
    - Dragging is buggy, after clicking and dragging, it seems to still register the 
    mouse as clicked down unless you click on the node again. 

Temporal Media
    - Clicking on a link to a Temporal Node from an anchors within a text or an image 
    node doesn’t take you to the linked timestamp (but the start of the medaia) 
    because it links directly to the node rather than setting the selected node 
    (as the link menu does) and which is how I set the timestamp to the linked timestamp.

Visualisation Modal
    - The randomly generated postions aren't perfect so sometimes not all nodes appear. 
    
## Estimated Hours Taken
50 hours
