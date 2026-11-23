// uygulama olarak kurulabilmesi için servis çalışanını kaydet
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
