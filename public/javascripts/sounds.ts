class User {
  name: string;
  id: string;
  isMember: boolean;
  isAdmin: boolean;
}

class Sound {
  id?: number;
  name: string;
  length: number;
  file: string;
  owner: string;
}

class Category {
  id: number;
  name: string;
  membercount: number;
}

const category = (id, name, membercount) =>
  `<li class="list-group-item category" data-id="${id}">${name}<span class="glyphicon glyphicon-chevron-right pull-right"></span><span class="badge pull-right">${membercount}</span></li>`;

const sound = (id, name, length) =>
  `<li class="sound-item list-group-item" data-id="${id}>${name}<div class="flex-right"><span class="badge" style="margin-right: 10px;">${length}</span><button class="btn btn-md btn-default sound-btn" type="button"><span class="glyphicon glyphicon-play"></span></button></div></li>`;

const soundAdmin = (id, name, length) =>
  `<li class="sound-item list-group-item" data-id=${id}>${name}<div class="flex-left edit-icon"><a data-toggle="modal" data-target="#editSoundModal"><span class="fa fa-pencil"></span></a></div><div class="flex-right"><span class="badge" style="margin-right: 10px;">${length}</span><button class="btn btn-md btn-default sound-btn" type="button"><span class="glyphicon glyphicon-play"></span></button></div></li>`;

const listLoading: string =
  "<li class='list-group-item text-center'><span class='fa fa-refresh fa-spin'></span></li>";

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

function escapeHtml(string: string): String {
  return String(string).replace(/[&<>"'`=\/]/g, function(s) {
    return escapeMap[s];
  });
}

$(document).ready(() => {
  loadCategories(() => {
    $("#categorylist")
      .children()
      .first()
      .click();

    //Fix Typeahead Stuff
    $(".tt-input").focusout(function() {
      setTimeout(() => $(this).val(""), 1);
    });
  });

  $(document).on("show.bs.modal", ".modal", function() {
    var zIndex = 1040 + 10 * $(".modal:visible").length;
    $(this).css("z-index", zIndex);
    setTimeout(function() {
      $(".modal-backdrop")
        .not(".modal-stack")
        .css("z-index", zIndex - 1)
        .addClass("modal-stack");
    }, 0);
  });

  $(document).on("hidden.bs.modal", ".modal", function() {
    $(".modal:visible").length && $(document.body).addClass("modal-open");
  });

  $("#editSoundModal").on("show.bs.modal", function(event) {
    const modal = $(this);
    const soundID = $(event.relatedTarget)
      .parents(".sound-item")
      .data("id");

    $("#categories").tagsinput("removeAll");

    $.getJSON(`/jsapi/sounds/${soundID}`).done((sound: Sound) => {
      modal.find("#name").val(sound.name);
      sound.id = soundID;
      modal.data("sound", sound);
    });

    $.getJSON(
      `/jsapi/sounds/${soundID}/categories`
    ).done((categories: Category[]) => {
      const categoryInput = modal.find("#categories");

      categories.forEach(category => {
        categoryInput.tagsinput("add", category.name);
      });

      modal.data("categories_prev", categoryInput.val());
    });
  });

  $("#deleteSoundModal").on("show.bs.modal", function(event) {
    const sound = $(event.relatedTarget)
      .parents("#editSoundModal")
      .data("sound");
    $(this).data("sound", sound);
  });
});

function loadCategories(callback?): void {
  const categorylist = $("#categorylist");
  categorylist.empty();
  categorylist.append(listLoading);

  $.get("/jsapi/sounds/count").done(allcount => {
    $.getJSON("/jsapi/categories").done((data: Category[]) => {
      categorylist.empty();
      categorylist.append(category(null, "<strong>All</strong>", allcount));
      data.forEach(element => {
        categorylist.append(
          $(
            category(element.id, escapeHtml(element.name), element.membercount)
          ).fadeIn(200)
        );
      });

      $(".category").click(function() {
        $(".category").removeClass("active");
        $(this).addClass("active");
        let id = $(this).data("id");
        loadSounds(id);
      });

      if (callback) callback();
    });
  });
}

function loadSounds(cat_id: number): void {
  const soundlist = $("#soundlist");
  const apiurl = cat_id
    ? `/jsapi/categories/${cat_id}/sounds`
    : "/jsapi/sounds";
  soundlist.empty();
  soundlist.append(listLoading);

  $.getJSON("/auth/user").done((user: User) => {
    $.getJSON(apiurl).done((data: Sound[]) => {
      soundlist.hide();
      soundlist.empty();
      data.forEach(element => {
        if (element.owner == user.id || user.isAdmin)
          soundlist.append(
            soundAdmin(
              element.id,
              escapeHtml(element.name),
              formatTime(element.length)
            )
          );
        else
          soundlist.append(
            sound(
              element.id,
              escapeHtml(element.name),
              formatTime(element.length)
            )
          );
      });
      soundlist.fadeIn(200);
      0;
    });
  });
}

function formatTime(time: number): string {
  let seconds = time % 60;
  let minutes = (time - seconds) / 60;
  let secondsString = ("00" + seconds).slice(-2);
  return `${minutes}:${secondsString}`;
}

function updateSound(obj) {
  const sound: Sound = $(obj)
    .parents("#editSoundModal")
    .data("sound");

  let categories_prev: string[] = $(obj)
    .parents("#editSoundModal")
    .data("categories_prev");

  const name: string = $("#name").val() as string;
  const categories: string[] = $("#categories").val() as string[];

  Promise.all([
    new Promise((resolve, reject) => {
      if (sound.name != name) {
        const form = new FormData();
        form.append("name", name);
        $.ajax({
          url: `/jsapi/sounds/${sound.id}`,
          method: "POST",
          data: form,
          contentType: false,
          processData: false,
          success: () => {
            resolve();
          },
          error: err => {
            reject(err);
          }
        });
      } else {
        resolve();
      }
    }),
    new Promise((resolve, reject) => {
      if (JSON.stringify(categories_prev) != JSON.stringify(categories)) {
        const form = new FormData();
        form.append("categories", JSON.stringify(categories));
        $.ajax({
          url: `/jsapi/sounds/${sound.id}/categories`,
          method: "POST",
          data: form,
          contentType: false,
          processData: false,
          success: () => {
            resolve();
          },
          error: err => {
            reject(err);
          }
        });
      } else {
        resolve();
      }
    })
  ]).then(() => {
    $("#editSoundModal").modal("hide");
    reload();
  });
}

function deleteSound(obj) {
  const sound: Sound = $(obj)
    .parents("#deleteSoundModal")
    .data("sound");

  $.ajax({
    url: `/jsapi/sounds/${sound.id}`,
    method: "DELETE"
  }).done(() => {
    $(".modal").modal("hide");
    reload();
  });
}

function reload() {
  let curCategory = $("#categorylist > .active").data("id");
  loadCategories(() => {
    const curCategoryElement = $("#categorylist").find(
      `[data-id="${curCategory}"]`
    );
    if (curCategory && curCategory.length > 0) {
      curCategory.click();
    } else {
      $("#categorylist")
        .children()
        .first()
        .click();
    }
  });
}

const categories = new Bloodhound({
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
