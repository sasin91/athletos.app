import axios from "axios";
import Alpine from "alpinejs";
import { confetti } from "@tsparticles/confetti";

window.axios = axios;
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

if (! window.Alpine) {
    window.Alpine = Alpine;

    Alpine.start();
}

window.confetti = confetti;