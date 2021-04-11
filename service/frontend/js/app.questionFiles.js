const questionFilesButton = document.getElementById("questionFilesButton");
const questionFilesModal = document.getElementById("questionFilesModal");
const listFiles = document.getElementById("listFiles");
const questionFilesCloseButton = $(questionFilesModal).find('.btn-close');

if (questionFilesModal) {

    questionFilesButton.addEventListener('click', () => {
        let modalBackdrop = document.createElement("div"),
            questionId = questionFilesButton.dataset.questionId

        modalBackdrop.id = 'modalBackdrop';
        modalBackdrop.setAttribute("class", "modal-backdrop fade show");
        questionFilesModal.setAttribute("style", "display: block");
        questionFilesModal.classList.add("show");
        document.getElementById('kt_header').getElementsByClassName('kt-header-menu-buttons')[0].appendChild(modalBackdrop)
        $.ajax({
            type: "POST",
            url: "/show-question-files",
            data: JSON.stringify(questionId),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
        }).done((data)=>{
            data = JSON.parse(data)
            let html = ''
            $.map(data, (file)=>{
                html += '<div><a href="'+file.UrlIsszd+'">'+file.DocumentName+'</a></div>'
            })
            $(listFiles).html(html)

        })
    });

    Array.from(questionFilesCloseButton).map((val) => {
        val.addEventListener('click', () => {
            questionFilesModal.removeAttribute("style");
            questionFilesModal.classList.remove("show");
            let modalBackdrop = document.getElementById('modalBackdrop')
            modalBackdrop.parentNode.removeChild(modalBackdrop);
        })
    });
}