var NotePage=Parse.Object.extend("NotePage");
var Tag=Parse.Object.extend("Tag");
var Tagging=Parse.Object.extend("Tagging");
//var ShareCommand=Parse.Object.extend("ShareCommand");
var Update=Parse.Object.extend("Update");

// Whenever a user is saved, make sure there's a corresponding MainPage
Parse.Cloud.beforeSave(Parse.User, function(request,response){
    var user=request.object;
    var acl=new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    user.setACL(acl);
    if (!user.get("displayname")
            || user.get("username")!=user.get("displayname").toLowerCase())
        user.set("displayname",user.get("username"));
    response.success();
});

/*Parse.Cloud.afterSave(Parse.User, function(request){
    var mainpage=request.object.get("mainpage");
    if(!mainpage)
        Parse.Cloud.run("startOffUser");
});*/

Parse.Cloud.define("startOffUser",function(request,response){
    console.log('startOffUser');
    var startTime=new Date().getTime();

    var acl=new Parse.ACL();
    acl.setReadAccess(request.user.id,true);

    var mainpage=new NotePage({
        name: request.user.get("displayname")+"'s Links",
        content: "",
        type: "linker",
        numLinkedBy: 1});
    mainpage.set("user",request.user);
    mainpage.setACL(acl);

    var tutpage=new NotePage({
        name: "Tutorial",
        content: "",
        type: "linker",
        numLinkedBy: 1});
    tutpage.set("user",request.user);
    tutpage.setACL(acl);

    var toSave=[];
    var tutPages=[];
    var demotut=NotePage.createWithoutData("gcCPxkBnZZ");
    demotut.relation("linksTo").query()
    .each(function(dt){
        console.log("eaching "+JSON.stringify(dt));
        var np=new NotePage({
            user: request.user,
            name: dt.get("name"),
            content: dt.get("content"),
            lost: false,
            lowercase_name: dt.get("lowercase_name"),
            tagstring: dt.get("tagstring"),
            type: dt.get("type")
        });
        var acl=new Parse.ACL();
        acl.setReadAccess(request.user,true);
        np.setACL(acl);
        toSave.push(np);
        tutPages.push(np)

        var up1=new Update({
            note:np,
            change:"retag",
            user: request.user});
        toSave.push(up1);
        var up2=new Update({
            note:np,
            change:"editText",
            user: request.user});
        toSave.push(up2);

        return Parse.Promise.as();
    })
    .then(function(){
        console.log("about to save all");
        return Parse.Object.saveAll(toSave,{useMasterKey:true});
    })
    .then(function(){
        console.log("about to add links");
        for(t=0;t<tutPages.length;t++)
            tutpage.relation("linksTo").add(tutPages[t]);
    })
    .then(function(res){
        console.log('about to save tp');
        return tutpage.save(null,{useMasterKey: true})
    })
    .then(function(res){
        console.log('about to add tp to mp');
        mainpage.relation("linksTo").add(tutpage);
        return mainpage.save(null,{useMasterKey: true})
    })
    .then(function(res){
        console.log("Saved mainpage");
        return new Parse.Query(Parse.User)
            .equalTo("username","demo")
            .limit(1)
            .find({useMasterKey: true})
    })
    .then(function(d){
        request.user.set("mainpage",mainpage);
        request.user.set("preamble",d[0].get("preamble"));
        request.user.set("autocomplete",d[0].get("autocomplete"));
        request.user.set("shortcuts",d[0].get("shortcuts"));
        return request.user.save();
    })
    .then(function(res){
        console.log("Total time");
        console.log(new Date().getTime()-startTime);
        return Parse.Cloud.run("checkUpdates");
    })
    .then(function(res){
        response.success();
    },function(err){
        response.error(err)
    });
});


Parse.Cloud.define("createNotePage",function(request,response){
    if(! request.params.name) {
        response.error("Must supply a name!");
        return;
    }
    else if( request.params.name.match(/[\[\]\$]|''/)){
    }
    else if(!(request.params.type=="linker" || request.params.type=="note")) {
        response.error("Invalid NotePage type!");
        return;
    }

    var acl=new Parse.ACL();
    acl.setReadAccess(request.user,true);
    var np= new NotePage({
            name: request.params.name,
            content: request.params.content || "Click here to start editing...",
            type: request.params.type,
            lost: true,
            user: request.user
        });
    np.setACL(acl);
    np.save(null,{useMasterKey: true})
    .then(function(res){
        response.success(res)
    },function(error){
        response.error(error.message)
    });
});


Parse.Cloud.define("linksTo",function(request,response){
    
    var fromObj, toObj;
    var adding=request.params.linksTo;

    new Parse.Query("NotePage")
        .containedIn("objectId",[request.params.fromId,request.params.toId])
        .limit(2)
        .find()
    .then(function(res){
        if (res.length!=2)
            return Parse.Promise.error("Note not found");
        else {
            if(res[0].id==request.params.fromId){
                fromObj=res[0];
                toObj=res[1];
            }
            else {
                fromObj=res[1];
                toObj=res[0];
            }
            return linksTo(fromObj,toObj,adding,request.user)
        }
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });

});

function linksTo(fromObj,toObj,adding,user){
    return Parse.Promise.as()
    .then(function(){
        if(fromObj.get("user").id!=user.id)
            return Parse.Promise.error("You don't own this note");

        else if(toObj.get("user").id==user.id)
            if( adding && toObj.get("lost") )
                return toObj.save({lost:false},{useMasterKey:true});
            else if ( !adding && !toObj.get("lost"))
                return new Parse.Query(NotePage)
                    .equalTo("linksTo",toObj)
                    .equalTo("user",user)
                    .limit(2)
                    .find()
                .then(function(res){
                    if (res.length==1)
                        return toObj.save({lost:true},{useMasterKey:true});
                })
    })
    .then(function(){
        if(adding)
            fromObj.relation("linksTo").add(toObj);
        else
            fromObj.relation("linksTo").remove(toObj);
        return fromObj.save(null,{useMasterKey: true});
    })
};


Parse.Cloud.define("renameNotePage",function(request,response){
    if(!(request.params.noteId && request.params.newName)){
        response.error("Must give a note Id and a new name");
        return;
    }

    new Parse.Query(NotePage).get(request.params.noteId)
    .then(function(res){
        notePage=res;
        if(notePage.get("user").id!=request.user.id)
            return Parse.Promise.error("You don't own this note.");
        else {
            notePage.set("name",request.params.newName);
            return notePage.save(null, {useMasterKey:true});
        }
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });
    
});

Parse.Cloud.define("editText",function(request,response){
    new Parse.Query(NotePage).get(request.params.noteId)
    .then(function(notePage){
        if(notePage.get("user").id!=request.user.id)
            return Parse.Promise.error("You don't own this note.");
        else {
            var toSave=[];
            if(notePage.get("tagstring")!=request.params.newTags){
                notePage.set("tagstring",request.params.newTags);
                toSave.push(new Update({
                    note:notePage,
                    change:"retag",
                    user: request.user}));
            }
            if(notePage.get("content")!=request.params.newText){
                notePage.set("content",request.params.newText);
                toSave.push(new Update({
                    note: notePage,
                    change:"editText",
                    user:request.user}));
            }
            toSave.push(notePage);
            return Parse.Object.saveAll(toSave, {useMasterKey:true});
        }
    })
    .then(function(res){
        response.success('Edits saved');
    },function(error){
        response.error(error);
    });
});

/*Parse.Cloud.define("copyNotePage",function(request,response){
    console.log("startTime");
    var startTime=new Date().getTime();
    var other;
    var mine;
    var numLinks=0;
    new Parse.Query(NotePage).get(request.params.noteId)
    .then(function(theother){
        other=theother;
        mine=new NotePage({
            name: other.get('name'),
            content: other.get('content'),
            type: other.get('type'),
            user: request.user});
        var acl=new Parse.ACL();
        acl.setReadAccess(request.user.id,true);
        mine.setACL(acl);

        return other.relation("linksTo").query()
        .each(function(target){
            mine.relation("linksTo").add(target);
        })
    })
    .then(function(res){
        return mine.save(null,{useMasterKey: true})
    })
    .then(function(res){
        return new Update({note: mine, change:"finishCopy", details: other.id,user:request.user}).save();
    })
    .then(function(res){
        var taggings=[];
        return new Parse.Query(Tagging)
            .equalTo("note",other)
            .include("tag")
        .each(function(tag){
            taggings.push(new Tagging({tag:tag.get("tag"),note:mine}));
        })
        .then(function(res){
                return Parse.Object.saveAll(taggings,{useMasterKey:true});
        });
    })
    .then(function(res){
        console.log("Took time");
        console.log(new Date().getTime()-startTime);
        response.success(mine);
    },function(error){
        response.error(error);
    });
});*/

Parse.Cloud.define("deleteNotePage",function(request,response){
    var toDel;
    var ups=[];
    new Parse.Query("NotePage")
        .get(request.params.objId)
    .then(function(res){
        toDel=res;
        if(request.user.id!=toDel.get("user").id)
            return Parse.Promise.error("You don't own this note.");
    })
    .then(function(res){
        return toDel.relation("linksTo").query()
        .each(function(lt){
            if (lt.get("user").id==request.user.id)
                ups.push(new Update({
                    note:lt,
                    change:"recount",
                    user:request.user}));
            return Parse.promise.as();
        });
    })
    .then(function(res){
        return toDel.destroy({useMasterKey: true});
    })
    .then(function(){
        return Parse.Object.saveAll(ups);
    })
    .then(function(res){
        response.success()
    },
    function(error){
        response.error(error);
    });
});

Parse.Cloud.define("shareNotePage",function(request,response){
    console.log('snp');
    var page;
    new Parse.Query("NotePage").get(request.params.noteId)
    .then(function(res){
        page=res;
        if(page.get("user").id!=request.user.id)
            return Parse.Promise.error("You don't own this note");
        else {
            page.getACL().setPublicReadAccess(request.params.share);
            return page.save(null,{useMasterKey:true})
        }
    })
    .then(function(){
        console.log('abttomakeshareupdate');
        console.log({note: page.get("name"), change: request.params.share ? "share" : "unshare",user:request.user.get("displayname")});
        return new Update(
            {note: new NotePage({objectId: page.id}), change: request.params.share ? "share" : "unshare",user:request.user})
            .save()
    })
    .then(function(res){
        console.log('suc');
        response.success("Succeeded");
    },function(error){
        console.log('err');
        console.log(error.message);
        response.error(error);
    });

});

Parse.Cloud.beforeSave("NotePage",function(request,response){
    request.object.set("lowercase_name",
        request.object.get("name").toLowerCase());
    response.success();
});

Parse.Cloud.beforeDelete(Parse.User,function(request,response){
    new Parse.Query(NotePage)
        .equalTo("user",request.object).find({useMasterKey:true})
    .then(function(notepages){
        return Parse.Object.destroyAll(notepages,{useMasterKey:true});
    })
    .then(function(res){
        response.success();
    },function(err){
        response.error(err)
    });
});

Parse.Cloud.beforeDelete("NotePage",function(request,response){
    new Parse.Query("Tagging")
        .equalTo("note",request.object).find()
    .then(function(taggings){
        return Parse.Object.destroyAll(taggings,{useMasterKey:true})
    })
    .then(function(res){
        response.success();
    },function(err){
        response.error(err)
    });
});


Parse.Cloud.beforeDelete("Tagging",function(request,response){
    console.log('deleting');
    console.log(request.object);
    var tag;
    new Parse.Query(Tag).get(request.object.get('tag').id)
    .then(function(thetag){
        tag=thetag;
        console.log('tag');
        console.log(tag);
        return new Parse.Query(Tagging)
            .equalTo("tag",tag)
            .limit(2)
            .find()
    })
    .then(function(res){
        if (res.length==1)
            return tag.destroy({useMasterKey:true})
    })
    .then(function(res){
        response.success();
    },
    function(err){
        response.error(err.message);
    });
});

function addTag(note,tagname){
    return new Parse.Query(Tag)
        .equalTo("name",tagname)
        .limit(1)
        .find()
    .then(function(res){
        if(res.length)
            return Parse.Promise.as(res[0]);
        else
            return new Tag({name: tagname})
                .save(null,{useMasterKey:true});
    })
    .then(function(tag){
        return new Tagging({tag:tag,note:note})
            .save(null,{useMasterKey:true});
    });
}


Parse.Cloud.define("fbLoggedIn",function(request,response){
    var displayname=request.params.name;
    var name=displayname.toLowerCase();
    request.user.set('email',request.params.email);

    new Parse.Query(Parse.User).equalTo("username",name).limit(1).find({useMasterKey:true})
    .then(function(res){
        console.log('inq');
        console.log(res);
        if (!res.length)
            request.user.set('displayname',displayname);
        else
            request.user.set('displayname',displayname+" "+request.user.id);
        request.user.set('username',request.user.get('displayname').toLowerCase());
        return request.user.save();
    }).then(function(res){
        response.success();
    },function(err){
        request.user.destroy();
        response.error(err);
    })
});

Parse.Cloud.define("checkUpdates",function(request,response){

    (function updatesLoop(){
        console.log("started a loop");
        myEach(
            new Parse.Query(Update)
                .include("note")
                .addAscending("updatedAt"),
            function(up){
                console.log(up.get("change"));
                //console.log([ up.get("note").get("user").id,up.get("user")]);
                if (up.get("note") && up.get("note").get("user").id==up.get("user").id)
                    switch(up.get("change")) {
                        case "share":
                        case "unshare":
                            return updateSharing(up);
                        case "retag":
                            return updateTagging(up);
                        case "editText":
                            return updateLinks(up);
                        case "finishCopy":
                            return finishCopy(up);
                        case "recount":
                            return updateCount(up);
                        case "delete":
                            return deleteNotePage(up);
                        default:
                            return up.destroy();
                    }
                else
                    return up.destroy();
            },
            {}//{useMasterKey:true}
        )
        .then(function(res){
            console.log("completed a loop");
            if (res=="Empty updates")
                response.success("Empty updates");
            else
                updatesLoop();
        });
    })();

    function myEach(query,callback,options) {   ////////  LIMITED TO 100 right now!!!
        return query.find(options)
        .then(function(res){
            function f(i){
                return callback(res[i])
                .always(function(){
                    if( (i+1) <res.length )
                        return f(i+1);
                    else
                        return Parse.Promise.as();
                });
            }
            console.log("in mE");
            console.log(res.length);
            if (res.length)
                return f(0);
            else
                return Parse.Promise.as("Empty updates");
        });
    }

    function updateSharing(up){
        var note=up.get("note");
        if(note.get("user").id!=request.user.id)
            return up.destroy();
        var toShare=up.get("change")=="share";
        return (function(){
            //console.log(up.get("change")+"  "+note.get('name'));
            if (note.get("type")=="linker")
                return note.relation("linksTo").query()
                    .equalTo("user",up.get('user'))
                .each(function(childnote){
                    if(childnote.getACL().getPublicReadAccess()!=toShare)
                        return new Update(
                            { note: childnote, change: up.get("change"),user:request.user})
                            .save();
                    else
                        return Parse.Promise.as();
                })//,{useMasterKey:true})
            else
                return Parse.Promise.as();
        })()
        .then(function(){
            if(note.getACL().getPublicReadAccess()!=toShare){
                note.getACL().setPublicReadAccess(toShare);
                return note.save(null,{useMasterKey:true})
            }
            else
                return Parse.Promise.as();
        })
        .then(function(){
            return up.destroy();
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message);
            return up.save();
        });
    }

    function updateTagging(up){
        var newTagNames=up.get("note").get("tagstring").split(";")
            .map(function(t){return t.replace(/^\s*|\s*$/g,"").toLowerCase()})
            .filter(function(t){return (t!="")});
        return new Parse.Query(Tagging)
            .equalTo("note",up.get("note"))
            .include("tag")
            .find()
        .then(function(res){
            var oldTagNames=res.map(function(t){return t.get("tag").get("name")});
            var destructions=[];
            for(var ot=0; ot<oldTagNames.length; ot++)
                if(newTagNames.indexOf(oldTagNames[ot])==-1)
                    destructions.push(res[ot]);
            var creationPromises=[];
            for(var nt=0; nt<newTagNames.length; nt++)
                if(oldTagNames.indexOf(newTagNames[nt])==-1)
                    creationPromises.push(addTag(up.get("note"),newTagNames[nt]));
            return Parse.Promise.when(
                creationPromises.concat([Parse.Object.destroyAll(destructions,{useMasterKey:true})]));
        })
        .then(function(res){
            return up.destroy();
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message);
            return up.save();
        });
    }

    function updateLinks(up){
        var note=up.get("note");
        var newLinks=(note.get("content").match(/\[\[[^\]]+\]\]/g) || [])
            .map(function(ls){return ls.substring(2,ls.length-2).split('|')[1]})
            .filter(onlyUnique);
        var newLinkObjs;

        return new Parse.Query(NotePage)
            .containedIn("objectId",newLinks)
            .find()
        .then(function(theNewLinkObjs){
            newLinkObjs=theNewLinkObjs;
            newLinks=newLinkObjs.map(function(nlo){return nlo.id});
            return note.relation("linksTo").query().find({useMasterKey:true});
        })
        .then(function(oldLinkObjs){
            var oldLinks=oldLinkObjs.map(function(l){return l.id});
            var removalPromises=[];

            console.log("old");
            console.log(oldLinks);
            console.log("new");
            console.log(newLinks);

            for(var ol=0;ol<oldLinks.length; ol++)
                if(newLinks.indexOf(oldLinks[ol])==-1)
                    removalPromises.push(linksTo(note,oldLinkObjs[ol],false,request.user));
            var additionPromises=[];
            for(var nl=0; nl<newLinks.length; nl++)
                if(oldLinks.indexOf(newLinks[nl])==-1)
                    additionPromises.push(linksTo(note,newLinkObjs[nl],true,request.user));

            return Parse.Promise.when(removalPromises.concat(additionPromises));
        })
        .then(function(res){
            return up.destroy();
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message ? err.message : err)
            return up.save();
        });
    };

    function finishCopy(up){
        var mine=up.get("note");
        var other;
        console.log('in fC');
        return new Parse.Query(NotePage).get(up.get("details"))
        .then(function(res){
            other=res;
            var newups=[];
            console.log('about to linkto');
            return other.relation("linksTo").query()
            .each(function(target){
                if(target.get("user").id==up.get("user").id)
                    newups.push(new Update({note:target,change:"recount",user:request.user}));
                mine.relation("linksTo").add(target);
                return Parse.Promise.as();
            })
            .then(function(res){
                console.log('about to save linkto');
                newups.push(mine);
                return Parse.Object.saveAll(newups,{useMasterKey:true});
            })
        })
        /*.then(function(res){     ////////////////////////////////////////////// DON'T DUPLICATE TAGS
            return new Parse.Query(Tagging)
                .equalTo("note",other)
                .include("tag")
            .each(function(tag){
                return new Tagging({tag:tag.get("tag"),note:mine})
                    .save(null,{useMasterKey:true});
            })
        })*/
        .then(function(res){
            console.log('about to linksTo mine');
            return new Parse.Query(NotePage)
                .equalTo("linksTo",other.id)
                .equalTo("user",up.get("user"))
            .each(function(lf){
                console.log("need to change text links");

                if(lf.get("type")=="note")
                    lf.set("content",
                        lf.get("content").replace(new RegExp(other.id,"g"),mine.id));

                lf.relation("linksTo").remove(other);
                lf.relation("linksTo").add(mine);
                return lf.save(null,{useMasterKey:true});
            })//,{useMasterKey:true})
        })
        .then(function(res){
            return updateCount(up);
        });
    }

    function updateCount(up){
        note=up.get("note")
        console.log('in uC');
        return new Parse.Query(NotePage)
            .equalTo("linksTo",note)
            .equalTo("user",note.get("user"))
            .limit(10)
            .find()
        .then(function(res){
            note.set("numLinkedBy",res.length);
            return note.save(null,{useMasterKey:true});
        })
        .then(function(res){
            return up.destroy();
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message ? err.message : err)
            return up.save();
        });
    }

    function deleteNotePage(up){

    }
});

Parse.Cloud.beforeSave("Update",function(request,response){
    console.log('beforeSaveUpdate');
    console.log(JSON.stringify(request));
    if (request.master || request.user.id==request.object.get("user").id)
        response.success();
    else
        response.error("You can't create an update for someone else!");
});

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}
