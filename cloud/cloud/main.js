"use strict";

var Item2=Parse.Object.extend("Item2",
    {defaults: {name:"unnamed", type:"", content:"no content."}});

Parse.Cloud.beforeSave(Parse.User, function(request,response){
    var mainbinder= request.object.has("mainbinder") || request.object.get("mainbinder");
    if(mainbinder)
        response.success();
    else {
        mainbinder=new Item2({name: "Your Binder",type: "mainbinder"});
        mainbinder.save().then(
            function(){
                request.object.set("mainbinder",mainbinder);
                response.success();
            },
            function(error){
                response.error(error);
            }
        );
    }
});


Parse.Cloud.afterSave("Item2", function(request){
    request.object.relation("linkedBy").query().find().then(
        function(results){
            if(request.object.get("numLinkedBy")!=results.length)
                request.object.set("numLinkedBy",results.length);
                request.object.save().then(
                    function(o){console.log('suc');},
                    function(e){console.log(e.message);}
                );
            }
        );
});

Parse.Cloud.afterDelete("Item2", function(request){
    new Parse.Query("Item2")
        .equalTo("linkedBy",request.object.id).find().then(
        function(results){
            for (var r=0; r<results.length; r++){
                results[r].increment("numLinkedBy",-1);
                results[r].save({error:function(e){console.log(e.message)}});
            }
        });
});
