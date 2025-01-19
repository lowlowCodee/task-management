document.addEventListener('DOMContentLoaded', function () {
  let teamContainer = document.querySelector('.card-container');
  let addTeamBtn = document.querySelector('#addTeamBtn');
  let teamNameInput = document.querySelector('#teamName');
  let memberNameInput = document.querySelector('#memberName');
  let taskNameInput = document.querySelector('#taskName');
  let dueDateInput = document.querySelector('#dueDate');
  let currentTeamIndex = null;
  let currentMemberIndex = null;
  let teamToDeleteIndex = null;
  let deleteMemberIndex = null;



  let data = JSON.parse(localStorage.getItem('taskManagementData')) || { teams: [] };


  function saveData() {
    localStorage.setItem('taskManagementData', JSON.stringify(data));
  }

  // CHART
  function renderChart() {
    if (!window.CanvasJS) return;


    let dataPoints = data.teams.map(team => {
      let completedTasks = countCompletedTasks(team);
      let totalTasks = countTotalTasks(team);
      return {
        y: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        label: team.name
      };
    });

    let chart = new CanvasJS.Chart("chartContainer", {
      animationEnabled: true,
      theme: "light2",
      title: {
        text: "Team Progress"
      },
      axisY: {
        title: "Task Completion (%)",
        maximum: 100
      },
      data: [{
        type: "column",
        showInLegend: true,
        legendMarkerColor: "blue",
        legendText: "Progress of Teams",
        dataPoints: dataPoints.length > 0 ? dataPoints : [{ y: 0, label: "No Data" }]
      }]
    });

    chart.render();


    let totalTasks = 0;
    let totalCompleted = 0;

    data.teams.forEach(team => {
      team.members.forEach(member => {
        if (member.task) {
          totalTasks++;
          if (member.task.status === 'Completed') {
            totalCompleted++;
          }
        }
      });
    });

    let overallCompletionPercentage = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    let overallChart = new CanvasJS.Chart("overallChartContainer", {
      animationEnabled: true,
      theme: "light2",
      title: {
        text: "Overall Task Progress"
      },
      data: [{
        type: "pie",
        showInLegend: true,
        toolTipContent: "{name}: {y}%",
        dataPoints: [
          { y: overallCompletionPercentage, name: "Completed Tasks", color: "green" },
          { y: 100 - overallCompletionPercentage, name: "Incomplete Tasks", color: "red" }
        ]
      }]
    });

    overallChart.render();
  }



  function renderTeams() {
    teamContainer.innerHTML = '';
    if (data.teams.length === 0) {
      teamContainer.innerHTML = '<h1 class="text-center fw-bold mt-4">No Teams Available</h1>';
    } else {
      data.teams.forEach((team, teamIndex) => createTeamCard(team, teamIndex));
    }
    renderChart();
  }


  addTeamBtn.addEventListener('click', function () {
    let teamName = teamNameInput.value.trim();
    if (teamName) {
      let newTeam = { name: teamName, members: [] };
      data.teams.push(newTeam);
      showAlert('Team Added', 'success');
      saveData();
      renderTeams();
      teamNameInput.value = '';
    } else {
      showAlert('Please enter a team name.', 'danger');
    }
  });

  renderChart();

  // ito yung pag create ng team card
  function createTeamCard(team, teamIndex) {
    let teamCard = document.createElement('div');
    teamCard.classList.add('col-md-6');
    teamCard.innerHTML = `
            <div class="card mt-4 shadow-lg">
                <div class="card-header d-flex justify-content-between">
                    <h2>${team.name}</h2>
                    <button class="btn btn-outline-danger btn-sm delete-team-btn">Delete Team</button>
                </div>
                <div class="card-body">
                    <button class="btn btn-success add-member-btn" data-bs-toggle="modal" data-bs-target="#addMemberModal">
                        <ion-icon name="person-add-outline"></ion-icon>
                    </button>
                    <div class="table-responsive mt-2">
                        <table class="table table-bordered text-center table-secondary">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Member Name</th>
                                    <th>Task Name</th>
                                    <th>Status</th>
                                    <th>Due Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody class="member-list">
                                ${renderMembers(team, teamIndex)}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <h4 class="float-end">${countCompletedTasks(team)}/${countTotalTasks(team)} tasks completed</h4>
                </div>
            </div>
        `;
    teamContainer.appendChild(teamCard);

    teamCard.querySelector('.add-member-btn').addEventListener('click', function () {
      currentTeamIndex = teamIndex;
    }); //ito yung add member button

    teamCard.querySelector('.delete-team-btn').addEventListener('click', function () {
      teamToDeleteIndex = teamIndex;
      let deleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
      deleteModal.show();
    });
  }
  renderChart();

  document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    if (teamToDeleteIndex !== null) {

      deleteTeam(teamToDeleteIndex);
      showAlert('Team deleted successfully', 'danger');

      teamToDeleteIndex = null;
      let deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
      deleteModal.hide();
    }
  });



  // ito naman yung pag render ng members
  function renderMembers(team, teamIndex) {
    const currentDate = new Date(); // Get the current date

    return (
      team.members
        .map((member, memberIndex) => {

          if (member.task && member.task.status !== 'Completed') {
            const dueDate = new Date(member.task.dueDate);

            if (currentDate > dueDate) {
              member.task.status = 'Overdue';
            }
          }

          return `
            <tr>
              <td>${memberIndex + 1}</td>
              <td>${member.name}</td>
              <td>${member.task ? member.task.name : 'No Tasks'}</td>
              <td>
                <span class="${member.task && member.task.status === 'Overdue' ? 'overdue' : ''}">
                  ${member.task ? member.task.status : '-'}
                </span>
              </td>
              <td>${member.task ? member.task.dueDate : '-'}</td>
              <td>
                <button class="btn btn-info mt-1" onclick="showTaskModal(${teamIndex}, ${memberIndex})">
                  <ion-icon name="add-outline"></ion-icon>
                </button>
                ${member.task && member.task.status !== 'Completed'
              ? `<button class="btn btn-success mt-1" onclick="markTaskAsCompleted(${teamIndex}, ${memberIndex})">
                        <ion-icon name="checkmark-done-outline"></ion-icon>
                      </button>`
              : `<button class="btn btn-secondary mt-1" disabled>
                        <ion-icon name="checkmark-done-outline"></ion-icon>
                      </button>`
            }
                <button class="btn btn-warning mt-1" onclick="editMember(${teamIndex}, ${memberIndex})">
                  <ion-icon name="create-outline"></ion-icon>
                </button>
                <button class="btn btn-danger mt-1" onclick="deleteMember(${teamIndex}, ${memberIndex})">
                  <ion-icon name="trash-outline"></ion-icon>
                </button>
              </td>
            </tr>
          `;
        })
        .join('') || `<tr><td colspan="6" class="fw-bold">No Data</td></tr>`
    );
  }



  function countCompletedTasks(team) {
    return team.members.filter((member) => member.task && member.task.status === 'Completed').length;
  }

  function countTotalTasks(team) {
    return team.members.filter((member) => member.task).length;
  }

  function deleteTeam(teamIndex) {
    data.teams.splice(teamIndex, 1);
    showAlert('Team Deleted', 'danger');
    saveData();
    renderTeams();
    renderChart();
  } // ito naman delete team 

  document.querySelector('#saveMemberBtn').addEventListener('click', function () {
    let memberName = memberNameInput.value.trim();
    if (memberName && currentTeamIndex !== null) {
      let newMember = { name: memberName, task: null };
      data.teams[currentTeamIndex].members.push(newMember);
      document.getElementById('close').click();
      showAlert('Member added', 'success');
      saveData();
      renderTeams();
      renderChart();
      memberNameInput.value = '';
      new bootstrap.Modal(document.querySelector('#addMemberModal')).hide();
    } else {
      showAlertModal('Please enter a member name.', 'danger');
    }
  });

  window.showTaskModal = function (teamIndex, memberIndex) {
    currentTeamIndex = teamIndex;
    currentMemberIndex = memberIndex;
    let member = data.teams[teamIndex].members[memberIndex];
    taskNameInput.value = member.task ? member.task.name : '';
    dueDateInput.value = member.task ? member.task.dueDate : '';
    new bootstrap.Modal(document.querySelector('#addTaskModal')).show();
  };

  document.querySelector('#saveTaskBtn').addEventListener('click', function () {
    let taskName = taskNameInput.value.trim();
    let dueDate = dueDateInput.value.trim();

    if (taskName && dueDate && currentTeamIndex !== null && currentMemberIndex !== null) {
      data.teams[currentTeamIndex].members[currentMemberIndex].task = {
        name: taskName,
        dueDate: dueDate,
        status: 'In Progress',
      };
      document.getElementById('close').click();
      showAlert('task added', 'success');
      saveData();

      renderTeams();
      renderChart();

      let addTaskModal = bootstrap.Modal.getInstance(document.querySelector('#addTaskModal'));
      if (addTaskModal) {
        addTaskModal.hide();
      }
    } else {
      alert('please enter a task.');
      // console.log('No task entered, showing alert');
      showAlertModal('Please enter a Task!.', 'danger');

    }
  });

  window.markTaskAsCompleted = function (teamIndex, memberIndex) {
    let member = data.teams[teamIndex].members[memberIndex];
    if (member.task) {
      member.task.status = 'Completed';
      showAlert('task completed', 'success');
      saveData();
      renderTeams();
      renderChart();
    }
  };

  window.editMember = function (teamIndex, memberIndex) {
    currentTeamIndex = teamIndex;
    currentMemberIndex = memberIndex;

    let memberName = data.teams[teamIndex].members[memberIndex].name;
    document.getElementById('editMemberName').value = memberName;

    let editMemberModal = new bootstrap.Modal(document.getElementById('editMemberModal'));
    editMemberModal.show();
  };

  document.getElementById('editMemberForm').addEventListener('submit', function (e) {
    e.preventDefault();

    let newMemberName = document.getElementById('editMemberName').value;
    if (newMemberName) {
      data.teams[currentTeamIndex].members[currentMemberIndex].name = newMemberName;
      showAlert('Edited Successfull', 'warning');
      saveData();
      renderTeams();

      let editMemberModal = bootstrap.Modal.getInstance(document.getElementById('editMemberModal'));
      editMemberModal.hide();
    } else {
      showAlertModal('Please enter a valid content.', 'danger');
    }
  });

  window.deleteMember = function (teamIndex, memberIndex) {
    deleteTeamIndex = teamIndex;
    deleteMemberIndex = memberIndex;

    let confirmDeleteModal = new bootstrap.Modal(document.querySelector('#confirmDeleteModal'));
    confirmDeleteModal.show();
  };

  document.querySelector('#confirmDeleteBtn').addEventListener('click', function () {
    if (deleteTeamIndex !== null && deleteMemberIndex !== null) {

      data.teams[deleteTeamIndex].members.splice(deleteMemberIndex, 1);
      showAlert('Member Deleted Successfully', 'danger');
      saveData();
      renderTeams();
    }

    deleteTeamIndex = null;
    deleteMemberIndex = null;

    let confirmDeleteModal = bootstrap.Modal.getInstance(document.querySelector('#confirmDeleteModal'));
    confirmDeleteModal.hide();

  });

  renderTeams();
  renderChart();

  function showAlert(message, type) {
    let alert = document.getElementById('alert');
    alert.innerHTML = `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button> ${message}`;
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.classList.remove('d-none');

    setTimeout(function () {
      alert.classList.add('d-none');
    }, 4000);
  }
  function showAlertModal(message, type) {
    let alertModal = document.getElementById('alertModal');
    alertModal.innerHTML = `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button> ${message}`;
    alertModal.className = `alert alert-${type} alert-dismissible fade show`;
    alertModal.classList.remove('d-none');

    setTimeout(function () {
      alertModal.classList.add('d-none');
    }, 4000);
  }

  function checkOverdueTasks() {
    let today = new Date();

    data.teams.forEach(team => {
      team.members.forEach(member => {
        member.tasks.forEach(task => {
          let taskDueDate = new Date(task.dueDate);
          if (taskDueDate < today && task.status !== "Completed") {

            task.status = "Overdue";
          }
        });
      });
    });

    saveData();
    renderTeams();
  }


});
