import * as express from "express";

export class DefaultTab {

    public static getRequestHandler(): express.RequestHandler {
        return async function (req: any, res: any, next: any): Promise<void> {
            try {
                // SABRONER = insert flowview, script is a link to the bundled flowview code
                let htmlPage = `<!DOCTYPE html>
                    <html>
                    <head>
                        <title>Bot Info</title>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <script src='https://statics.teams.microsoft.com/sdk/v1.0/js/MicrosoftTeams.min.js'></script>
                        <script src='https://code.jquery.com/jquery-1.11.3.min.js'></script>
                        <link href="https://ajax.aspnetcdn.com/ajax/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet" />
                        <link href="https://ajax.aspnetcdn.com/ajax/bootstrap/3.3.7/css/bootstrap-theme.min.css" rel="stylesheet" />
                        <script src="https://81f1fdd9.ngrok.io/bundle.js"></script>

                        <style>
                        @import url(https://fonts.googleapis.com/css?family=Roboto:300);
                        body {
                        touch-action: none;
                        margin: 0px 0px 0px 0px;
                        font-family: 'Segoe UI', sans-serif;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        position: absolute;
                        }
                        #content {
                        position: absolute;
                        left: 0px;
                        top: 0px;
                        bottom: 50px;
                        right: 0px;
                        z-index: 0;
                        background-color: darkgrey;
                        }
                        #hitPlane {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 2;
                        }
                        .drawSurface {
                        touch-action: none;
                        /* Disable touch behaviors, like pan and zoom */
                        position: absolute;
                        left: 0px;
                        top: 0px;
                        width: 100%;
                        height: 100%;
                        }
                        .selectable {
                        z-index: 1;
                        }
                        .collab-document {
                        background-color: white;
                        position: relative;
                        }
                        .canvas-chrome {
                        background-color: dimgray;
                        position: absolute;
                        z-index: 11;
                        padding: 5px;
                        }
                        .banner {
                        color: blue;
                        }
                        .collab-object {
                        margin: 15px;
                        border: black 1px solid;
                        background: lightblue;
                        }
                        .collab-cell {
                        margin: 15px;
                        border: black 1px solid;
                        background: lightcoral;
                        }
                        .stickyNote {
                        touch-action: none;
                        user-select: none;
                        -ms-user-select: none;
                        position: absolute;
                        color: darkred;
                        background-color: yellow;
                        box-shadow: none;
                        width: 300px;
                        height: 300px;
                        transform-origin: 0px 0px;
                        z-index: 1;
                        }
                        .stickySelected {
                        box-shadow: 10px 10px 20px #444444;
                        z-index: 10;
                        }
                        .stickyInkable {
                        background: url(../images/grid.gif) repeat;
                        overflow: auto;
                        }
                        .navbar-shared-text {
                        background-color: #F1F1F1;
                        min-height: unset;
                        }
                        .navbar-shared-text ul {
                        padding: 5px 15px;
                        }
                        @media (min-width: 768px) {
                        .navbar-shared-text ul {
                            padding: 5px 0px;
                        }
                        }
                        .navbar-shared-text ul.list-inline {
                        margin-bottom: 0px;
                        }
                        .navbar-prague {
                        background-color: #222;
                        }
                        .btn-flat {
                        border: none;
                        background-color: inherit;
                        width: 100%;
                        height: 100%;
                        }
                        .btn-palette {
                        border-radius: 0;
                        background-color: #333;
                        width: 50px;
                        height: 50px;
                        padding: 5px;
                        border: none;
                        }
                        .btn-palette:hover {
                        background-color: orangered;
                        }
                        .prague-icon {
                        background-size: 50%;
                        background-repeat: no-repeat;
                        background-position: center center;
                        }
                        .prague-icon-pencil {
                        background-size: 50%;
                        background-repeat: no-repeat;
                        background-position: center center;
                        background-image: url("../../images/icons/pencil.svg");
                        }
                        .prague-icon-replay {
                        background-size: 50%;
                        background-repeat: no-repeat;
                        background-position: center center;
                        background-image: url("../../images/icons/backward.svg");
                        }
                        .dropdown-menu > li > a.color-choice {
                        width: 100%;
                        height: 50px;
                        }
                        .dropdown-menu > li > a.color-choice:hover,
                        .dropdown-menu > li > a.color-choice:focus {
                        background-color: inherit;
                        background-image: inherit;
                        }
                        .dropdown-menu-prague {
                        padding: 0 0;
                        }
                        .navbar-nav.navbar-palette {
                        margin: 0;
                        }
                        .navbar-nav.navbar-palette > li {
                        float: left;
                        }
                        .typing-details {
                        margin-top: 25px;
                        }
                        @keyframes fadein {
                        from {
                            opacity: 0;
                        }
                        to {
                            opacity: 1;
                        }
                        }
                        .login-page {
                        width: 360px;
                        padding: 8% 0 0;
                        margin: auto;
                        }
                        .form {
                        position: relative;
                        z-index: 1;
                        background: #FFFFFF;
                        max-width: 360px;
                        margin: 0 auto 100px;
                        padding: 45px;
                        text-align: center;
                        box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.2), 0 5px 5px 0 rgba(0, 0, 0, 0.24);
                        }
                        .form input {
                        font-family: "Roboto", sans-serif;
                        outline: 0;
                        background: #f2f2f2;
                        width: 100%;
                        border: 0;
                        margin: 0 0 15px;
                        padding: 15px;
                        box-sizing: border-box;
                        font-size: 14px;
                        }
                        .form textarea {
                        font-family: "Roboto", sans-serif;
                        outline: 0;
                        background: #f2f2f2;
                        width: 100%;
                        height: 300px;
                        border: 0;
                        margin: 0 0 15px;
                        padding: 15px;
                        box-sizing: border-box;
                        font-size: 14px;
                        overflow-y: auto;
                        resize: none;
                        /* enable below lines to make text invisible. */
                        -webkit-text-security: disc;
                        -moz-text-security: disc;
                        text-security: disc;
                        }
                        .form button {
                        font-family: "Roboto", sans-serif;
                        text-transform: uppercase;
                        outline: 0;
                        background: #4CAF50;
                        width: 100%;
                        border: 0;
                        padding: 15px;
                        color: #FFFFFF;
                        font-size: 14px;
                        -webkit-transition: all 0.3 ease;
                        transition: all 0.3 ease;
                        cursor: pointer;
                        }
                        .form button:hover,
                        .form button:active,
                        .form button:focus {
                        background: #43A047;
                        }
                        .loginbody {
                        background: #76b852;
                        font-family: "Roboto", sans-serif;
                        }
                        .indicatortext {
                        color: #fff;
                        font-weight: bold;
                        display: none;
                        /* hide by default */
                        }
                        .form .specialmessage {
                        margin: 15px 0 0;
                        color: #b3b3b3;
                        font-size: 12px;
                        }
                        .form .specialmessage a {
                        color: #4CAF50;
                        text-decoration: none;
                        }
                        div.titleletters {
                        width: 90%;
                        margin: 0 auto;
                        text-align: center;
                        }
                        .titleletter {
                        display: inline-block;
                        font-weight: 900;
                        font-size: 4em;
                        margin: 0.2em;
                        position: relative;
                        color: #4CAF50;
                        transform-style: preserve-3d;
                        perspective: 400;
                        z-index: 1;
                        }
                        .titleletter:before,
                        .titleletter:after {
                        position: absolute;
                        content: attr(data-letter);
                        transform-origin: top left;
                        top: 0;
                        left: 0;
                        }
                        .titleletter,
                        .titleletter:before,
                        .titleletter:after {
                        transition: all 0.3s ease-in-out;
                        }
                        .titleletter:before {
                        color: #fff;
                        text-shadow: -1px 0px 1px rgba(255, 255, 255, 0.8), 1px 0px 1px rgba(0, 0, 0, 0.8);
                        z-index: 3;
                        transform: rotateX(0deg) rotateY(-15deg) rotateZ(0deg);
                        }
                        .titleletter:after {
                        color: rgba(0, 0, 0, 0.11);
                        z-index: 2;
                        transform: scale(1.08, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 1deg);
                        }
                        .titleletter:hover:before {
                        color: #fafafa;
                        transform: rotateX(0deg) rotateY(-40deg) rotateZ(0deg);
                        }
                        .titleletter:hover:after {
                        transform: scale(1.08, 1) rotateX(0deg) rotateY(40deg) rotateZ(0deg) skew(0deg, 22deg);
                        }
                        .status-bar ul {
                        padding-left: 0px;
                        display: inline-block;
                        list-style: none;
                        }
                        .status-bar ul li {
                        display: inline-block;
                        margin-left: 5px;
                        }
                        .title-bar {
                        display: inline-block;
                        padding-top: 6px;
                        }
                        .graph-canvas {
                        padding-left: 0;
                        padding-right: 0;
                        margin-left: auto;
                        margin-right: auto;
                        display: block;
                        width: 800px;
                        }
                        #parent-canvas {
                        width: 100%;
                        height: 1200px;
                        overflow: auto;
                        }
                    </style>
                    </head>

                    <body>
                        <div id="text"></div>
                    </body>
                    </html>`;

                res.send(htmlPage);
            } catch (e) {
                // Don't log expected errors - error is probably from there not being example dialogs
                res.send(`<html>
                    <body>
                    <p>
                        Sorry. There are no example dialogs to display.
                    </p>
                    <br>
                    <img src="/tab/error_generic.png" alt="default image" />
                    </body>
                    </html>`);
            }
        };
    }
}
