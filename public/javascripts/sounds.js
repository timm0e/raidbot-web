var User = (function () {
    function User() {
    }
    return User;
}());
var Sound = (function () {
    function Sound() {
    }
    return Sound;
}());
var Category = (function () {
    function Category() {
    }
    return Category;
}());
var category = function (id, name, membercount) {
    return "<li class=\"list-group-item category\" data-id=\"" + id + "\">" + name + "<span class=\"glyphicon glyphicon-chevron-right pull-right\"></span><span class=\"badge pull-right\">" + membercount + "</span></li>";
};
var sound = function (id, name, length) {
    return "<li class=\"sound-item list-group-item\" data-id=\"" + id + ">" + name + "<div class=\"flex-right\"><span class=\"badge\" style=\"margin-right: 10px;\">" + length + "</span><button class=\"btn btn-md btn-default sound-btn\" type=\"button\"><span class=\"glyphicon glyphicon-play\"></span></button></div></li>";
};
var soundAdmin = function (id, name, length) {
    return "<li class=\"sound-item list-group-item\" data-id=" + id + ">" + name + "<div class=\"flex-left edit-icon\"><a data-toggle=\"modal\" data-target=\"#editSoundModal\"><span class=\"fa fa-pencil\"></span></a></div><div class=\"flex-right\"><span class=\"badge\" style=\"margin-right: 10px;\">" + length + "</span><button class=\"btn btn-md btn-default sound-btn\" type=\"button\"><span class=\"glyphicon glyphicon-play\"></span></button></div></li>";
};
var listLoading = "<li class='list-group-item text-center'><span class='fa fa-refresh fa-spin'></span></li>";
$(document).ready(function () {
    loadCategories(function () {
        $("#categorylist").children().first().click();
    });
    $("#editSoundModal").on("show.bs.modal", function (event) {
        var modal = $(this);
        var soundID = $(event.relatedTarget).parents(".sound-item").data("id");
        $.getJSON("/jsapi/sounds/" + soundID).done(function (sound) {
            modal.find("#name").val(sound.name);
        });
    });
});
function loadCategories(callback) {
    var categorylist = $("#categorylist");
    categorylist.empty();
    categorylist.append(listLoading);
    $.get("/jsapi/sounds/count").done(function (allcount) {
        $.getJSON("/jsapi/categories").done(function (data) {
            categorylist.empty();
            categorylist.append(category(null, "<strong>All</strong>", allcount));
            data.forEach(function (element) {
                categorylist.append(category(element.id, element.name, element.membercount));
            });
            $(".category").click(function () {
                $(".category").removeClass("active");
                $(this).addClass("active");
                var id = $(this).data("id");
                loadSounds(id);
            });
            if (callback)
                callback();
        });
    });
}
function loadSounds(cat_id) {
    var soundlist = $("#soundlist");
    var apiurl = cat_id ? "/jsapi/categories/" + cat_id + "/sounds" : "/jsapi/sounds";
    soundlist.empty();
    soundlist.append(listLoading);
    $.getJSON("/auth/user").done(function (user) {
        $.getJSON(apiurl).done(function (data) {
            soundlist.empty();
            data.forEach(function (element) {
                if (element.owner == user.id)
                    soundlist.append(soundAdmin(element.id, element.name, formatTime(element.length)));
                else
                    soundlist.append(sound(element.id, element.name, formatTime(element.length)));
            });
        });
    });
}
function formatTime(time) {
    var seconds = time % 60;
    var minutes = (time - seconds) / 60;
    var secondsString = ("00" + seconds).slice(-2);
    return minutes + ":" + secondsString;
}
function editSound(obj) {
    var id = $(obj).parents(".sound-item").data("id");
    console.log(id);
}
