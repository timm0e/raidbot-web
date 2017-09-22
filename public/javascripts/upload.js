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


$(() => {
  $(".tt-input").focusout(function() {
    setTimeout(() => $(this).val(""), 1);
  })
})

function upload() {
  let form = new FormData();

  form.append("name", $("#name").val());
  form.append("categories", JSON.stringify($("#categories").val()));
  form.append("sound", $("#file").prop("files")[0]);

  const ajaxrequest = $.ajax({
    url: "/jsapi/sounds/new",
    method: "PUT",
    data: form,
    contentType: false,
    processData: false,
    success: () => {
      window.location.reload();
    },
    error: () => {
      window.location.reload();
    }
  });
}
