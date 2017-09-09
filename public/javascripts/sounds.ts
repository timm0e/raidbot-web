class User {
  name: string;
  id: string;
  isMember: boolean;
  isAdmin: boolean;
}

class Sound {
  id: number;
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

$(document).ready(() => {
  loadCategories(() => {
    $("#categorylist").children().first().click();
  });

  $("#editSoundModal").on("show.bs.modal", function(event) {
    const modal = $(this);
    const soundID = $(event.relatedTarget).parents(".sound-item").data("id");
    let categories;

    $.getJSON(`/jsapi/sounds/${soundID}`).done((sound: Sound) => {
      modal.find("#name").val(sound.name);
    });

    //TODO: Categories
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
          category(element.id, element.name, element.membercount)
        );
      });
  
      $(".category").click(function() {
        $(".category").removeClass("active");
        $(this).addClass("active");
        let id = $(this).data("id");
        loadSounds(id);
      });

      if (callback)
        callback();
    });
  })
}

function loadSounds(cat_id: number): void {
  const soundlist = $("#soundlist");
  const apiurl = cat_id ? `/jsapi/categories/${cat_id}/sounds` : "/jsapi/sounds";
  soundlist.empty();
  soundlist.append(listLoading);

  $.getJSON("/auth/user").done((user: User) => {
    $.getJSON(apiurl).done((data: Sound[]) => {
      soundlist.empty();
      data.forEach(element => {
        if (element.owner == user.id)
          soundlist.append(soundAdmin(element.id, element.name, formatTime(element.length)));
        else
          soundlist.append(sound(element.id, element.name, formatTime(element.length)));
      });
    });
  });
}

function formatTime(time: number): string {
  let seconds = time % 60;
  let minutes = (time - seconds) / 60;
  let secondsString = ("00" + seconds).slice(-2);
  return `${minutes}:${secondsString}`;
}

function editSound(obj) {
  let id = $(obj).parents(".sound-item").data("id");
  console.log(id);
}