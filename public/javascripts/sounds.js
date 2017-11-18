var User = /** @class */ (function () {
    function User() {
    }
    return User;
}());
var Sound = /** @class */ (function () {
    function Sound() {
    }
    return Sound;
}());
var Category = /** @class */ (function () {
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
var escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;"
};
function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return escapeMap[s];
    });
}
$(document).ready(function () {
    loadCategories(function () {
        $("#categorylist")
            .children()
            .first()
            .click();
        //Fix Typeahead Stuff
        $(".tt-input").focusout(function () {
            var _this = this;
            setTimeout(function () { return $(_this).val(""); }, 1);
        });
    });
    $(document).on("show.bs.modal", ".modal", function () {
        var zIndex = 1040 + 10 * $(".modal:visible").length;
        $(this).css("z-index", zIndex);
        setTimeout(function () {
            $(".modal-backdrop")
                .not(".modal-stack")
                .css("z-index", zIndex - 1)
                .addClass("modal-stack");
        }, 0);
    });
    $(document).on("hidden.bs.modal", ".modal", function () {
        $(".modal:visible").length && $(document.body).addClass("modal-open");
    });
    $("#editSoundModal").on("show.bs.modal", function (event) {
        var modal = $(this);
        var soundID = $(event.relatedTarget)
            .parents(".sound-item")
            .data("id");
        $("#categories").tagsinput("removeAll");
        $.getJSON("/jsapi/sounds/" + soundID).done(function (sound) {
            modal.find("#name").val(sound.name);
            sound.id = soundID;
            modal.data("sound", sound);
        });
        $.getJSON("/jsapi/sounds/" + soundID + "/categories").done(function (categories) {
            var categoryInput = modal.find("#categories");
            categories.forEach(function (category) {
                categoryInput.tagsinput("add", category.name);
            });
            modal.data("categories_prev", categoryInput.val());
        });
    });
    $("#deleteSoundModal").on("show.bs.modal", function (event) {
        var sound = $(event.relatedTarget)
            .parents("#editSoundModal")
            .data("sound");
        $(this).data("sound", sound);
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
                categorylist.append($(category(element.id, escapeHtml(element.name), element.membercount)).fadeIn(200));
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
    var apiurl = cat_id
        ? "/jsapi/categories/" + cat_id + "/sounds"
        : "/jsapi/sounds";
    soundlist.empty();
    soundlist.append(listLoading);
    $.getJSON("/auth/user").done(function (user) {
        $.getJSON(apiurl).done(function (data) {
            soundlist.hide();
            soundlist.empty();
            data.forEach(function (element) {
                if (element.owner == user.id || user.isAdmin)
                    soundlist.append(soundAdmin(element.id, escapeHtml(element.name), formatTime(element.length)));
                else
                    soundlist.append(sound(element.id, escapeHtml(element.name), formatTime(element.length)));
            });
            soundlist.find(".sound-btn").each(function (_, button) {
                $(button).click(function () {
                    playSound($(button)
                        .parents(".sound-item")
                        .attr("data-id"));
                });
            });
            soundlist.fadeIn(200);
        });
    });
}
function formatTime(time) {
    var seconds = time % 60;
    var minutes = (time - seconds) / 60;
    var secondsString = ("00" + seconds).slice(-2);
    return minutes + ":" + secondsString;
}
function updateSound(obj) {
    var sound = $(obj)
        .parents("#editSoundModal")
        .data("sound");
    var categories_prev = $(obj)
        .parents("#editSoundModal")
        .data("categories_prev");
    var name = $("#name").val();
    var categories = $("#categories").val();
    Promise.all([
        new Promise(function (resolve, reject) {
            if (sound.name != name) {
                var form = new FormData();
                form.append("name", name);
                $.ajax({
                    url: "/jsapi/sounds/" + sound.id,
                    method: "POST",
                    data: form,
                    contentType: false,
                    processData: false,
                    success: function () {
                        resolve();
                    },
                    error: function (err) {
                        reject(err);
                    }
                });
            }
            else {
                resolve();
            }
        }),
        new Promise(function (resolve, reject) {
            if (JSON.stringify(categories_prev) != JSON.stringify(categories)) {
                var form = new FormData();
                form.append("categories", JSON.stringify(categories));
                $.ajax({
                    url: "/jsapi/sounds/" + sound.id + "/categories",
                    method: "POST",
                    data: form,
                    contentType: false,
                    processData: false,
                    success: function () {
                        resolve();
                    },
                    error: function (err) {
                        reject(err);
                    }
                });
            }
            else {
                resolve();
            }
        })
    ]).then(function () {
        $("#editSoundModal").modal("hide");
        reload();
    });
}
function deleteSound(obj) {
    var sound = $(obj)
        .parents("#deleteSoundModal")
        .data("sound");
    $.ajax({
        url: "/jsapi/sounds/" + sound.id,
        method: "DELETE"
    }).done(function () {
        $(".modal").modal("hide");
        reload();
    });
}
function playSound(sid) {
    $.ajax({
        url: "/jsapi/play/" + sid,
        method: "POST"
    });
}
function reload() {
    var curCategory = $("#categorylist > .active").data("id");
    loadCategories(function () {
        var curCategoryElement = $("#categorylist").find("[data-id=\"" + curCategory + "\"]");
        if (curCategory && curCategory.length > 0) {
            curCategory.click();
        }
        else {
            $("#categorylist")
                .children()
                .first()
                .click();
        }
    });
}
var categories = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace("name"),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
        url: "/jsapi/categories"
    }
});
categories.initialize();
$("select").tagsinput({
    typeaheadjs: {
        name: "categories",
        displayKey: "name",
        valueKey: "name",
        source: categories.ttAdapter()
    }
});
