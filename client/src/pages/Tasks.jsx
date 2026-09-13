import { useCallback, useEffect, useState } from "react";
import { useToast } from "../context/ToastContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Loading from "../components/Loading.jsx";
import RewardModal from "../components/RewardModal.jsx";
import TaskCard from "../components/TaskCard.jsx";
import TaskForm from "../components/TaskForm.jsx";
import { MotionButton, MotionList, Reveal } from "../components/Motion.jsx";
import {
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  updateTask
} from "../services/taskService.js";
import { useLocation, useNavigate } from "react-router-dom";

export default function Tasks() {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [prefillTask, setPrefillTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [rewardResult, setRewardResult] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setTasks(await getTasks());
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const prefill = location.state?.prefill;

    if (!prefill) {
      return;
    }

    setEditingTask(null);
    setPrefillTask(prefill);
    setFormError("");
    setFormOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  function openCreateForm() {
    setEditingTask(null);
    setPrefillTask(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(task) {
    setEditingTask(task);
    setPrefillTask(null);
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setEditingTask(null);
    setPrefillTask(null);
    setFormError("");
    setFormOpen(false);
  }

  async function handleFormSubmit(values) {
    setSubmitting(true);
    setFormError("");

    try {
      if (editingTask) {
        const savedTask = await updateTask(editingTask.id, values);
        setTasks((current) =>
          current.map((task) => (task.id === savedTask.id ? savedTask : task))
        );
      } else {
        const createdTask = await createTask(values);
        setTasks((current) => [createdTask, ...current]);
      }
      showToast(editingTask ? "Quest updated." : "New quest added.");
      closeForm();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    try {
      await deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      showToast("Quest deleted.");
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, "error");
    }
  }

  async function handleComplete(task) {
    setCompletingId(task.id);
    setError("");

    try {
      const result = await completeTask(task.id);
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, ...result.task, completed: true } : item
        )
      );
      setRewardResult(result);
      showToast(`Quest complete! +${result.rewards.xp} XP and +${result.rewards.gold} gold.`);
      if (result.progression?.leveled_up) {
        showToast(`Level up! You reached level ${result.progression.current_level}.`, "info");
      }
      for (const achievement of result.achievements || []) {
        showToast(`Achievement unlocked: ${achievement.name}`, "achievement");
      }
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, "error");
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) {
    return <Loading label="Loading your quest board..." />;
  }

  const openTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="section-kicker">QUEST BOARD</span>
          <h1>Make progress on purpose.</h1>
          <p>Every completed quest builds your real-life character.</p>
        </div>
        <MotionButton className="button button-primary" type="button" onClick={openCreateForm}>
          + New quest
        </MotionButton>
      </section>

      {error ? <ErrorMessage message={error} onRetry={loadTasks} /> : null}

      {formOpen ? (
        <Reveal>
          <TaskForm
            editingTask={editingTask}
            initialValues={prefillTask}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            submitting={submitting}
            error={formError}
          />
        </Reveal>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">{openTasks.length} IN PROGRESS</span>
            <h2>Active quests</h2>
          </div>
          <span className="panel-count">{openTasks.length}</span>
        </div>
        {openTasks.length ? (
          <MotionList className="task-list">
            {openTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onEdit={openEditForm}
                onDelete={handleDelete}
                completing={completingId === task.id}
              />
            ))}
          </MotionList>
        ) : (
          <EmptyState
            title="No active quests"
            message="The next chapter starts with a single small goal."
            action={
              <button className="button button-primary button-small" type="button" onClick={openCreateForm}>
                Create a quest
              </button>
            }
          />
        )}
      </section>

      {completedTasks.length ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">VICTORIES</span>
              <h2>Completed quests</h2>
            </div>
            <span className="panel-count">{completedTasks.length}</span>
          </div>
          <MotionList className="task-list">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={() => {}} onEdit={() => {}} onDelete={() => {}} />
            ))}
          </MotionList>
        </section>
      ) : null}

      <RewardModal result={rewardResult} onClose={() => setRewardResult(null)} />
    </div>
  );
}
