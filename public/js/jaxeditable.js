function JaxEditable(container, options){
    options=options||{};

    //////////////////////////////////////////////////
    // Memory of recently entered characters, to
    // help in the detection of shortcuts.
    //////////////////////////////////////////////////

    // Key mappings
    var eWhichCodeMap = {

        // Numbers
        48:"0",49:"1",50:"2",51:"3",52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",

        // Capital letters
        65:"A",66:"B",67:"C",68:"D",69:"E",70:"F",71:"G",72:"H",73:"I",74:"J",
        75:"K",76:"L",77:"M",78:"N",79:"O",80:"P",81:"Q",82:"R",83:"S",84:"T",
        85:"U",86:"V",87:"W",88:"X",89:"Y",90:"Z",

        // Lowercase letters
        97: "a",98: "b",99: "c",100:"d",101:"e",102:"f",103:"g",104:"h",
        105:"i",106:"j",107:"k",108:"l",109:"m",110:"n",111:"o",112:"p",
        113:"q",114:"r",115:"s",116:"t",117:"u",118:"v",119:"w",120:"x",
        121:"y",122:"z",
        
        // Misc. punctuation
        33: "!",64: "@",35: "#",36: "$",37: "%",94: "^",38: "&",42: "*",40: "(",
        41: ")",45: "-",61: "+",95: "_",43: "=",44: ",",46: ".",60: "<",62: ">",
        47: "/",63: "?",59: ";",58: ":",39: "'",34: '"',91: "[",123:"{",93: "]",
        125:"}",92:"\\",124:"|",96: "`",126:"~"
    };

    // How many recent characters to hold in memory
    var howManyChars=options.maxShortcutLength || 10;

    // FIFO array of a few recently typed characters
    var recentMemory=[];

    // If eWhichCode is a valid event.which code in our mapping,
    // record it in recent memory, possibly evicting older characters
    // to make room.  If it is not a valid code, clear out the memory.
    // Returns the character in the first case, undefined in the latter.
    var recordChar=function(eWhichCode){
        var c=(eWhichCodeMap[eWhichCode]);
        if(c){
            if(recentMemory.length==howManyChars-1)
                recentMemory.shift();
            recentMemory.push([c, new Date().getTime()]);
        }
        else recentMemory=[];
        return c;
    }

    // Returns the characters continuously typed most recently as a
    // string ordered oldest to youngest. ageThreshold is the maximum
    // time ago (in ms) the character could have been typed that will
    // still get returned.
    rememberChars=function(ageThreshold){
        var threshold=new Date().getTime()-ageThreshold;
        return recentMemory
            .filter(function(elt){return elt[1]>threshold})
            .map(function(elt){return elt[0]})
            .join("");
    }

    //////////////////////////////////////////////////
    // Memoization for the autocomplete functionality
    //////////////////////////////////////////////////

    // I implement my own memoization routine rather than use
    // the one built into jQuery Text Complete, because I want
    // to be able to clear the cache if the user changes their
    // auto-complete preferences.
    var memo={};
    var autocomps=[];
    var memsearch=function(term,callback){
        if (!memo[term])
            memo[term]=
                autocomps.filter(function(elt,ind,arr){
                    return elt.startsWith(term);});
        callback(memo[term]);
    };


    // Return an object representing this JaxEditable
    return new function(){
        var self=this;

        var init=function(){

            // Store properties
            container=$(container);
            self.setShortcuts(options.shortnames,options.hotkeys);
            self.setAutocompletes(options.autocompletes||[]);
            self.setPreamble(options.preamble||"");
            self.setEditable(
                options.hasOwnProperty("editable") ?
                options.editable : true);

            // Record the character in short-term memory,
            container.on("keypress",function(e){
                if (!recordChar(e.which)) return;
            });

            // Listen for shortcuts
            container.on("keyup",keyUpHandler);

            // Autocomplete selected commands starting with a backslash
            container.textcomplete([{
                match: /\\(\w*)$/,
                search: memsearch,
                replace: function(value){
                    var sp=value.indexOf("/#/");
                    if (sp==-1)
                        return "\\"+value;
                    else
                        return ["\\"+value.substring(0,sp),
                            value.substring(sp+3)];
                },
                index: 1,
                cache: false
            }]);

            // Initialize the toolbar
            if(options.toolbar){
                var toolbar=$(options.toolbar);
                $(".je-icon-bold").click(function(e){
                    e.preventDefault();
                    document.execCommand("bold",false,null);
                });
                $(".je-icon-italic").click(function(e){
                    e.preventDefault();
                    document.execCommand("italic",false,null);
                });
                $(".je-icon-underline").click(function(e){
                    e.preventDefault();
                    document.execCommand("underline",false,null);
                });
                $(".je-icon-leftalign").click(function(e){
                    e.preventDefault();
                    document.execCommand("justifyLeft",false,null);
                });
                $(".je-icon-centeralign").click(function(e){
                    e.preventDefault();
                    document.execCommand("justifyCenter",false,null);
                });
                $(".je-icon-rightalign").click(function(e){
                    e.preventDefault();
                    document.execCommand("justifyRight",false,null);
                });
                $(".je-icon-bullets").click(function(e){
                    e.preventDefault();
                    document.execCommand("insertUnorderedList",false,null);
                });
                $(".je-icon-numbers").click(function(e){
                    e.preventDefault();
                    document.execCommand("insertOrderedList",false,null);
                });
            }
        }

        // Set whether the container is editable or not
        self.setEditable=function(editable){
            container.prop("contenteditable",editable);
        }

        // Places an image from src at the selection and 
        // adds the event handlers for editing the image
        self.insertImage=function(src,range){
            range=range || rangy.getSelection().getRangeAt(0);
            range.collapse();
            range.select();
            document.execCommand("insertImage",false,src);
            self.handle();
        }
        self.handle=function(){
            if(options.imgEventHandler)
                $(container).find("img")
                    .off("dblclick")
                    .off("taphold")
                    .on("dblclick",options.imgEventHandler)
                    .on("dblclick",options.imgEventHandler);
        }

        // Returns the range within the container
        self.getContainerRange=function(){
            var range=rangy.createRange();
            range.selectNodeContents(container.get(0));
            return range;
        }

        // To be called whenever a key is pressed
        var keyUpHandler=function(e){

            // Get the current caret position
            var sel=rangy.getSelection();
            var range=sel.getRangeAt(0);

            // If something is selected, stop
            if (!range.collapsed) return;

            // Look at the characters before the caret
            range.moveStart("character",-howManyChars);
            var recentText=range.text();

            // Get the matching shortcut if it exists
            var shortcutMatch=recentText.match(self.shortregex);
            if (shortcutMatch){
                var shortcut=shortcutMatch[0];
                var rep=self.shortcuts[shortcut];

                // Make sure that this shortcut was typed quickly
                // and continuously, otherwise don't trigger
                if(! rememberChars((shortcut.length-1)*900+100)
                        .endsWith(shortcut))
                    return;

                // Delete the text of the shortcut
                range.collapse();
                range.moveStart("character",-shortcut.length);
                range.deleteContents();

                // If the "replacement" is a function, call it
                if(typeof(rep) === "function")
                    rep();

                // Otherwise, it's a string, put it in
                else {
                    range.pasteHtml(rep);
                    range.moveStart("character",-rep.length);
                    self.nextLatexPoint(range);
                }
            }

        }

        // Sets shortnames and hotkeys, see description under
        // options for JaxEditable
        self.setShortcuts=function(shortnames,hotkeys){

            // Store all the shortnames in shortcuts
            self.shortcuts=shortnames || {};

            // Put hotkey for nextLatexPoint in shortcuts
            if (hotkeys && hotkeys.nextLatexPoint)
                self.shortcuts[hotkeys.nextLatexPoint]=self.nextLatexPoint;

            // Put hotkey for prevLatexPoint in shortcuts
            if (hotkeys && hotkeys.prevLatexPoint)
                self.shortcuts[hotkeys.prevLatexPoint]=self.prevLatexPoint;

            // Put hotkey for reLatex in shortcuts
            if (hotkeys && hotkeys.reLatex)
                self.shortcuts[hotkeys.reLatex]=self.reLatex;

            // Create a regular expression that returns whether a given
            // text ends with anything from the shortcuts list
            self.shortregex=RegExp("(?:"
                +Object.keys(self.shortcuts).map(
                    function(str){return str.replace(
                        /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
                        "\\$&");
                    }).join("|")
                +")$");
        }

        // Sets the LaTeX preamble to use
        self.setPreamble=function(newpreamble){
            self.preamble=newpreamble;
        }

        // Sets the commands for LaTeX autocomplete,
        self.setAutocompletes=function(newautocomps){
            autocomps=newautocomps;

            // Make sure to clear the autocomplete cache
            memo={};
        };

        // Jumps to the next point that a user might wish to enter
        // LaTeX, basically looking for wrappers ($,{,},[,]), but with 
        // some black magic for odd cases.
        self.nextLatexPoint=function(withinRange){

            // Unless otherwise instructed, stay in the container
            withinRange=withinRange||self.getContainerRange();

            // Get the current caret position
            var range=rangy.getSelection().getRangeAt(0);
            var copt={includeBlockContentTrailingSpace: true};

            function outsideRange(){
                return (
                    range.compareBoundaryPoints(
                        range.END_TO_END,withinRange)
                    > 0 
                );
            };

            // Find the next wrapping character 
            if(range.findText(/[\{\}\$\[\]]/,
                    {withinRange: withinRange})){
                // If it's a closing character, followed by
                // an opening character or ^/_, move ahead one
                // e.g. for \frac{'}{}, we want to go to
                // \frac{}{'}, not to \frac{}'{}
                // But don't leave withinRange
                if(range.text().match(/[\}\]]$/)){
                    range.moveEnd("character",1,copt);
                    if( (!range.text().match(/[\{\[\^\_]$/)) || outsideRange())
                        range.moveEnd("character",-1,copt);
                    else{

                        // And, if so, do that once more (ie
                        // e.g. for \int_{'}^{}, we want to go to
                        // \int_{}^{'}, not to \int_{}^'{}
                        // But don't leave withinRange
                        range.moveEnd("character",1,copt);
                        if( (!range.text().match(/[\{\[]$/)) || outsideRange())
                            range.moveEnd("character",-1,copt);
                    }
                }

                // Place the caret at end of this range
                range.collapse();
                range.select();
            }
        }

        // Jumps to the previous point that a user might wish to enter
        // LaTeX, basically looking for wrappers ($,{,},[,]), but with 
        // some black magic for odd cases.
        self.prevLatexPoint=function(withinRange){

            // Unless otherwise instructed, stay in the container
            withinRange=withinRange||self.getContainerRange();

            // Get the current caret position
            var range=rangy.getSelection().getRangeAt(0);
            var copt={includeBlockContentTrailingSpace: true};

            function outsideRange(){
                return (
                    range.compareBoundaryPoints(
                        range.START_TO_START,withinRange)
                    < 0 
                );
            };

            // Find the previous wrapping character 
            if(range.findText(/[\{\}\$\[\]]/,
                    {withinRange: withinRange,
                    direction: "backward"})){

                // If it's an opening character, preceded by
                // an closing character or ^/_/\, move back one
                // e.g. for \frac{}{'}, we want to go to
                // \frac{'}{}, not to \frac{}'{}
                // But don't leave withinRange
                if(range.text().match(/^[\{\[]/)){
                    range.moveStart("character",-1,copt);
                    if( (!range.text().match(/^[\}\]\^\_\\]/)) || outsideRange())
                        range.moveStart("character",1,copt);
                    else{

                        // And, if so, do that once more (ie
                        // e.g. for \int_{}^{'}, we want to go to
                        // \int_{'}^{}, not to \int_{}'^{}
                        // But don't leave withinRange
                        range.moveStart("character",-1,copt);
                        if( (!range.text().match(/^[\}\]]/)) || outsideRange())
                            range.moveStart("character",1,copt);
                    }
                }
                // Also, if at \[ \LaTeX \]', want to go to
                // \[ \LaTeX '\], not \[ \LaTeX \']
                else if(range.text().match(/^\]/)){
                    range.moveStart("character",-1,copt);
                    if( (!range.text().match(/^\\/)) || outsideRange())
                        range.moveStart("character",1,copt);
                }

                // Place the caret at start of this range
                range.collapse(true);
                range.select();
            }
        }

        self.reLatex=function(){
            container.prepend(
                $("<span style='display:none' "+
                        "id='preamble'></span>")
                    .text(self.preamble));
            container.prepend(
                $("<span style='display:none' "+
                    "id='begingroup'>$\\begingroup$</span>"));
            container.append(
                $("<span style='display:none' "+
                    "id='endgroup'>$\\endgroup$</span>"));
            container.get(0).normalize();
            container.find(" .MathJax").map(function(ind,elt){
                MathJax.Hub.getJaxFor(elt).Remove()});
            MathJax.Hub.Queue(["Typeset",MathJax.Hub,container.get(0)]);
            MathJax.Hub.Queue(function(){
                container.find(".MathJax_Display")
                    .prop("contenteditable","false");
                container.find(":not(.MathJax_Display) .MathJax")
                    .prop("contenteditable","false");

                container.find(":not(.MathJax_Display) .MathJax")
                    .taphold(function(e){
                        var next=$(this.nextSibling);
                        var jax=next.html();

                        $(this.previousSibling).remove();
                        next.remove();

                        $(this).replaceWith("$"+jax+"$");
                    }).dblclick(function(e){$(this).trigger("taphold")});
                container.find(".MathJax_Display")
                    .taphold(function(e){
                        var next=$(this.nextSibling);
                        var jax=next.html();

                        $(this.previousSibling).remove();
                        next.remove();

                        $(this).replaceWith("\\["+jax+"\\]");

                    }).dblclick(function(e){$(this).trigger("taphold")});

                container.find("#begingroup, #endgroup, #preamble")
                    .remove();
                if(container.contents().last().get(0) &&
                        container.contents().last().get(0).nodeName!="#text")
                    container.append(document.createTextNode('\u00A0'));
            });
        }

        init();
    }


}





            // For insert menu

            /*
            //var text=self.inp.val();
            //var pos=self.inp.getCursorPosition();

            // For tracking xx -> insert
            var now = new Date().getTime();
            if (prevKey==xKeyCode && e.keyCode==prevKey && (now-prevKeyTime)<1000){
                self.inp.val(text.substr(0,pos-2)+text.substr(pos));
                self.inp.selectRange(pos-2);
                prevKey=-1;
                $("#popupInsert").popup("open");
                return;
            }
            if (prevKey==lbracKeyCode && e.keyCode==prevKey && (now-prevKeyTime)<1000){
                Pager._historyStates[Pager._historyPointer][1].noteState={text:text,pos:pos};
                Pager.stateData.addToNP={
                    id:self.cur_note.id,
                    type:"note",
                    text:text, pos:pos};
                Pager.stateData.children_ids=[];
                Pager.anchor("addTo");
                Pager.goTo("#searchPage");
            }
            prevKey=e.keyCode;
            prevKeyTime=now;
            */
