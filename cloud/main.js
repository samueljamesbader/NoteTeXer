var NotePage=Parse.Object.extend("NotePage");
var Tag=Parse.Object.extend("Tag");
var Tagging=Parse.Object.extend("Tagging");
var ShareCommand=Parse.Object.extend("ShareCommand");

// Whenever a user is saved, make sure there's a corresponding MainPage
Parse.Cloud.beforeSave(Parse.User, function(request,response){
    var user=request.object;
    var acl=new Parse.ACL();
    acl.setPublicReadAccess(false);
    user.setACL(acl);
    console.log('bs');
    console.log(user.get('username'));
    console.log(user.get('displayname'));
    if (!user.get("displayname")
            || user.get("username")!=user.get("displayname").toLowerCase())
        user.set("displayname",user.get("username"));
    response.success();
});

Parse.Cloud.afterSave(Parse.User, function(request){
    var mainpage=request.object.get("mainpage");
    if(!mainpage)
        Parse.Cloud.run("startOffUser");
});

Parse.Cloud.define("startOffUser",function(request,response){

    var startTime=new Date().getTime();

    var acl=new Parse.ACL();
    acl.setReadAccess(request.user.id,true);

    var mainpage=new NotePage({
        name: "Your Page",
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


    var demotut=new NotePage();
    demotut.id="gcCPxkBnZZ";
    demotut.relation("linksTo").query()
    .each(function(t){
        console.log(t.get('name'));
        tutpage.relation("linksTo").add(t);
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
    else if(!(request.params.type=="linker" || request.params.type=="note")) {
        response.error("Invalid NotePage type!");
        return;
    }

    new Parse.Query("NotePage")
        .equalTo("user",request.user)
        .equalTo("name",request.params.name)
        .limit(1)
        .find()
    .then(function(res){
        if(res.length)
            return Parse.Promise.error(
                new Parse.Error(Parse.Error.DUPLICATE_VALUE,
                    "A NotePage with that name already exists"));
    })
    .then(function(res){
        var acl=new Parse.ACL();
        acl.setReadAccess(request.user,true);
        var np= new NotePage({
                name: request.params.name,
                content: request.params.content || "",
                type: request.params.type,
                numLinkedBy: 0,
                user: request.user
            });
        np.setACL(acl);
        return np.save(null,{useMasterKey: true});
    })
    .then(function(res){
        response.success(res)
    },function(error){
        response.error(error.message)
    });
});


Parse.Cloud.define("addLink",function(request,response){
    if(!(request.params.fromId && request.params.toId)) {
        response.error("Must give a 'toId' and 'fromId' to make a link!");
        return;
    }
    
    var fromObj;
    var toObj;
    new Parse.Query("NotePage").get(request.params.fromId)
    .then(function(res){
        fromObj=res;
        return new Parse.Query("NotePage").get(request.params.toId)
    })
    .then(function(res){
        toObj=res;
        return fromObj.relation("linksTo").query()
            .equalTo("objectId",toObj.id)
            .first();
    })
    .then(function(res){
        if(res) return Parse.Promise.error("This link already exists");
    })
    .then(function(res){
        return addLink(fromObj,toObj,request.user);
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });

});
function addLink(fromObj,toObj,user){
    
    return fromObj.relation("linksTo").query()
        .equalTo("objectId",toObj.id)
        .limit(1)
        .find()
    .then(function(res){
        if(res.length)
            return Parse.Promise.error("This link already exists");
    })
    .then(function(res){
        if(toObj.get("user").id==user.id){
            toObj.increment("numLinkedBy");
            return toObj.save(null,{useMasterKey: true});
        }
    })
    .then(function(res){
        fromObj.relation("linksTo").add(toObj);
        return fromObj.save(null,{useMasterKey: true});
    })
};

Parse.Cloud.define("removeLink",function(request,response){
    if(!(request.params.fromId && request.params.toId))
        response.error("Must give a 'toId' and 'fromId' to make a link!");

    var fromObj;
    var toObj;
    new Parse.Query("NotePage").get(request.params.fromId)
    .then(function(res){
        fromObj=res;
        return fromObj.relation("linksTo").query()
            .equalTo("objectId",request.params.toId).
            first();
    })
    .then(function(res){
        toObj=res;
        if(!toObj)
            Parse.Promise.error("This link does not exist.");
    })
    .then(function(res){
        if(toObj.get("user").id==request.user.id){
            toObj.increment("numLinkedBy",-1);
            return toObj.save(null,{useMasterKey: true});
        }
    })
    .then(function(res){
        fromObj.relation("linksTo").remove(toObj);
        return fromObj.save(null,{useMasterKey: true});
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });

});

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
    var notePage;
    var newTagNames=request.params.newTags.split(";")
        .map(function(t){return t.replace(/^\s*|\s*$/g,"").toLowerCase()})
        .filter(function(t){return (t!="")});

    new Parse.Query(NotePage).get(request.params.noteId)
    .then(function(res){
        notePage=res;
        if(notePage.get("user").id!=request.user.id)
            return Parse.Promise.error("You don't own this note.");
        else {
            notePage.set("content",request.params.newText);
            return notePage.save(null, {useMasterKey:true});
        }
    })
    .then(function(res){
        return new Parse.Query(Tagging)
            .equalTo("note",notePage)
            .include("tag")
            .find();
    })
    .then(function(res){
        var oldTagNames=res.map(function(t){return t.get("tag").get("name")});
        var destructionPromises=[];
        for(var ot=0; ot<oldTagNames.length; ot++)
            if(newTagNames.indexOf(oldTagNames[ot])==-1)
                destructionPromises.push(
                    res[ot].destroy({useMasterKey:true}));
        var creationPromises=[];
        for(var nt=0; nt<newTagNames.length; nt++)
            if(oldTagNames.indexOf(newTagNames[nt])==-1)
                creationPromises.push(addTag(notePage,newTagNames[nt]));
        return Parse.Promise.when(
            destructionPromises.concat(creationPromises));
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });
});

Parse.Cloud.define("copyNotePage",function(request,response){
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
        return mine.save(null,{useMasterKey: true})
    })
    .then(function(res){
        return other.relation("linksTo").query()
        .each(function(target){
            return addLink(mine,target,request.user);
        })
    })
    .then(function(res){
        return new Parse.Query(Tagging)
            .equalTo("note",other)
            .include("tag")
        .each(function(tag){
            return new Tagging({tag:tag.get("tag"),note:mine})
                .save(null,{useMasterKey:true});
        })
    })
    .then(function(res){
        return new Parse.Query(NotePage)
            .equalTo("linksTo",other.id)
        .each(function(lf){
            if (lf.get("user").id==request.user.id){
                lf.relation("linksTo").remove(other);
                lf.relation("linksTo").add(mine);
                numLinks++;
                return lf.save(null,{useMasterKey:true});
            }
            else return Parse.Promise.as();
        })
    })
    .then(function(res){
        console.log("about to set nlb");
        mine.set("numLinkedBy",numLinks);
        mine.save(null,{useMasterKey: true});
    })
    .then(function(res){
        console.log("Took time");
        console.log(new Date().getTime()-startTime);
        response.success(mine);
    },function(error){
        response.error(error);
    });
});

Parse.Cloud.define("deleteNotePage",function(request,response){
    var toDel;
    new Parse.Query("NotePage")
        .get(request.params.objId)
    .then(function(res){
        toDel=res;

        if(request.user.id!=toDel.get("user").id)
            return Parse.Promise.error("You don't own this note.");
    })
    .then(function(res){
        return new Parse.Query("NotePage")
            .equalTo("linksTo",toDel.id)
            .limit(1)
            .find()
    }).then(function(res){
        if(res.length)
            return Parse.Promise.error(
                "A page links to this one, can't delete");
    })
    .then(function(res){
        return toDel.relation("linksTo").query()
        .each(function(res){
            return Parse.Cloud.run("removeLink",
                {fromId: toDel.id, toId: res.id})});
    })
    .then(function(res){
        return new Parse.Query(Tagging)
            .equalTo("note",toDel)
            .each(function(tagging){
                return tagging.destroy({useMasterKey:true})})
    })
    .then(function(res){
        return toDel.destroy({useMasterKey: true});
    })
    .then(function(res){
        response.success()
    },
    function(error){
        response.error(error);
    });
});

Parse.Cloud.define("shareNotePage",function(request,response){
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
    .then(function(page){
        return new ShareCommand(
            {note: page, toshare: request.params.share})
            .save(null,{useMasterKey: true})
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });

});

Parse.Cloud.beforeSave("NotePage",function(request,response){
    request.object.set("lowercase_name",
        request.object.get("name").toLowerCase());
    response.success();
});

Parse.Cloud.afterDelete(Parse.User,function(request){
    Parse.Cloud.useMasterKey();
    new Parse.Query(NotePage)
    .equalTo("user",request.object)
    .each(function(res){res.destroy();});
});

Parse.Cloud.beforeDelete("NotePage",function(request,response){
    new Parse.Query("Tagging")
        .equalTo("note",request.object)
    .each(function(tagging){
        return tagging.destroy({useMasterKey:true})
    })
    .then(function(res){
        response.success();
    },function(err){
        response.error(err)
    });
});


Parse.Cloud.afterDelete("Tagging",function(request){
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
            .limit(1)
            .find()
    })
    .then(function(res){
        if (!res.length)
            return tag.destroy({useMasterKey:true})
    })
    .fail(function(err){
        console.log(err.message);
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

Parse.Cloud.job("cleanTags",function(request,status){
    Parse.Cloud.useMasterKey();
    status.success();
});

Parse.Cloud.job("updateShares",function(request,status){
    var startTime=new Date().getTime();
    var loopStartTime=0;
    (function updateSharesLoop(){
        loopStartTime=new Date().getTime();
        //console.log("started a loop");
        new Parse.Query(ShareCommand)
            .include("note")
            .each(function(sc){
                var note=sc.get("note");
                return (function(){
                    console.log(note.get('name'));
                    if (note.get("type")=="linker")
                        return note.relation("linksTo").query()
                        .each(function(childnote){
                            if(childnote.getACL().getPublicReadAccess()!=sc.get("toshare")
                                && note.get('user').id==childnote.get('user').id)
                                return new ShareCommand(
                                    { note: childnote, toshare: sc.get("toshare")})
                                    .save(null,{useMasterKey:true});
                            else
                                return Parse.Promise.as();
                        },{useMasterKey:true})
                    else
                        return Parse.Promise.as();
                })()
                .then(function(){
                    if(note.getACL().getPublicReadAccess()!=sc.get("toshare")){
                        note.getACL().setPublicReadAccess(sc.get("toshare"));
                        return note.save(null,{useMasterKey:true})
                    }
                    else
                        return Parse.Promise.as();
                })
                .then(function(){
                    return sc.destroy({useMasterKey:true});
                })
                .then(function(res){
                    return Parse.Promise.as(res);
                },
                function(err){
                    console.log(err.message);
                    return Parse.Promise.as();
                });
            },{useMasterKey:true})
            .then(function(){
                //if ((new Date().getTime()-startTime)>60000)
                    //status.success("running over a minute");
                //console.log("completed a loop");
                //console.log(loopStartTime);
                //console.log(new Date().getTime());
                while((new Date().getTime()-loopStartTime)<500)
                    1+1;
                loopStartTime=new Date().getTime();
                updateSharesLoop();
            });
    })();
});
