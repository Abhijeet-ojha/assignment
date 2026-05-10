window.Sockets = (() => {
  let socket = null;

  const init = ({ onTaskCreated, onTaskUpdated, onTaskDeleted, onConnect } = {}) => {
    socket = io();

    socket.on("connect", () => {
      if (onConnect) {
        onConnect();
      }
    });

    socket.on("task_created", (payload) => {
      onTaskCreated && onTaskCreated(payload);
    });

    socket.on("task_updated", (payload) => {
      onTaskUpdated && onTaskUpdated(payload);
    });

    socket.on("task_deleted", (payload) => {
      onTaskDeleted && onTaskDeleted(payload);
    });
  };

  return { init };
})();
