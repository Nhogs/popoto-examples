// Create error modal
var modalDiv = document.createElement("div");
modalDiv.setAttribute("id", "modal");

var modalContentDiv = document.createElement("div");
modalContentDiv.setAttribute("id", "modal-content");

var errorTitleP = document.createElement("p");
errorTitleP.setAttribute("id", "error-title");
errorTitleP.innerText = "An error occurred while trying to start Popoto please check your configuration and/or the console log:"

var errorContentP = document.createElement("p");
var errorContentCode = document.createElement("code");
errorContentCode.setAttribute("id", "error-content");

errorContentP.appendChild(errorContentCode);
modalContentDiv.appendChild(errorTitleP);
modalContentDiv.appendChild(errorContentP);

modalDiv.appendChild(modalContentDiv);
document.body.append(modalDiv);
