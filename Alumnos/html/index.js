function tutores(){
 
     window.location.href = 'RegistroTutor.html';;

   
}

function alumnos(){
 
   window.location.href = 'LoginRegitrocintrasena.html';

}
 function mostrarError(mensaje) {
            // Asegúrate de tener este div en tu HTML
            let div = document.getElementById('mensaje-error');
            if (!div) {
                div = document.createElement('div');
                div.id = 'mensaje-error';
                document.body.appendChild(div);
            }
            div.textContent = mensaje;
            div.style.display = 'block'; // O usa clases CSS

            setTimeout(() => {
                div.style.display = 'none';
            }, 4000);
        }
function vinculaT(){

    const usuario = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if(usuario !== "" && password !== ""){
        window.location.href = 'RegistroTutor.html';
    } else {
        mostrarError("Completa todos los campos");
    }

}

function vinculaA(){

    const usuario = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if(usuario !== "" && password !== ""){
        window.location.href = 'RegistroAlumnos.html';
    } else {
        mostrarError("Completa todos los campos");
    }

}