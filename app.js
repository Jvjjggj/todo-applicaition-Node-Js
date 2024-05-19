const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};
initializeDBAndServer();

const format = (dbResponse) => {
  return {
    id: dbResponse.id,
    todo: dbResponse.todo,
    priority: dbResponse.priority,
    status: dbResponse.status,
    category: dbResponse.category,
    dueDate: dbResponse.due_date,
  };
};

const checkRequestQueries = async (request, response, next) => {
  const { search_q, category, priority, status, date } = request.query;
  const { todoId } = request.params;
  if (category !== undefined) {
    const categoryLst = ["Work", "Home", "Learning"];
    const categoryInLst = categoryInLst.includes(category);
    if (categoryInLst) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (priority !== undefined) {
    const priorityLst = ["HIGH", "MEDIUM", "LOW"];
    const priorityInLst = priorityLst.includes(priority);
    if (priorityInLst) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (status !== undefined) {
    const statusLst = ["TO DO", "IN PROGRESS", "DONE"];
    const statusInLst = statusLst.includes(status);
    if (statusInLst) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date);
      const formatDate = format(new Date(date), "yyyy-MM-dd");
      console.log(formatDate);
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate}`
        )
      );
      console.log(result, "r");
      console.log(new Date(), "new");
      const isValidDate = await isValid(result);
      console.log(isValidDate, "V");
      if (isValidDate) {
        request.date = formatDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  request.todoId = todoId;
  request.search_q = search_q;
  next();
};

const checkRequestBody = async (request, response, next) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  const todoId = request.params;

  if (category !== undefined) {
    const categoryLst = ["Work", "HOME", "Learning"];
    const categoryInLst = categoryLst.includes(category);
    if (categoryInLst) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (priority !== undefined) {
    const priorityLst = ["HIGH", "MEDIUM", "LOW"];
    const priorityInLst = priorityLst.includes(priority);
    if (priorityInLst) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (status !== undefined) {
    const statusLst = ["TO DO", "IN PROGRESS", "DONE"];
    const statusInLst = statusLst.includes(status);
    if (statusInLst) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate);
      const formatedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const result = toDate(new Date(formatedDate));
      const isValidDate = isValid(result);
      if (isValidDate) {
        request.dueDate = formatedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  request.todo = todo;
  request.id = id;
  request.todoId = todoId;
  next();
};

// Get todo by status API  1

app.get("/todos/", checkRequestQueries, async (request, response) => {
  const { status = "", search_q = "", priority = "", category = "" } = request;
  const getTodoQuery = `select
                            id,todo,priority,status,category,due_date as dueDate
                        from 
                            todo 
                        where 
                            todo like '%${search_q}%' and priority like '%${priority}%' and status like '%${status}%' and category like '%${category}%'`;
  const todoArray = await db.all(getTodoQuery);
  response.send(todoArray);
});

// API  2

app.get("/todos/:todoId", checkRequestQueries, async (request, response) => {
  const { todoId } = request;
  const query = `select
                            id,todo,priority,status,category,due_date as dueDate
                        from 
                            todo 
                        where id=${todoId}`;
  const dbResponse = await db.get(query);
  response.send(dbResponse);
});

// API 3

app.get("/agenda/", checkRequestQueries, async (request, response) => {
  const { date } = request;
  const query = `select
                            id,todo,priority,status,category,due_date as dueDate
                        from 
                            todo 
                        where
                            due_date='${date}'`;
  const dbResponse = await db.get(query);
  response.send(dbResponse);
});

// API 4

app.post("/todos/", checkRequestBody, async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request;
  const query = `insert into todo 
                           (id, todo, category, priority, status, due_date)
                   values
                           (${id},'${todo}','${category}','${priority}','${status}','${dueDate}')`;
  const dbResponse = await db.run(query);
  console.log(dbResponse);
  response.send("Todo Successfully Added");
});

// API 5

app.put("/todos/:todoId", checkRequestBody, async (request, response) => {
  const { todoId } = request;
  const { todo, category, priority, status, dueDate } = request;
  let updatedQuery = null;
  switch (true) {
    case status !== undefined:
      updatedQuery = `update
                                todo
                            set 
                                status='${status}'
                            where
                                id=${todoId.todoId}`;
      await db.run(updatedQuery);
      response.send("Status Updated");
      break;
    case priority !== undefined:
      updatedQuery = `update
                                todo
                            set 
                                priority='${priority}'
                            where
                                id=${todoId.todoId}`;
      await db.run(updatedQuery);
      response.send("Priority Updated");
      break;
    case todo !== undefined:
      updatedQuery = `update
                                todo
                            set 
                                todo='${todo}'
                            where
                                id=${todoId.todoId}`;
      await db.run(updatedQuery);
      response.send("Todo Updated");
      break;

    case category !== undefined:
      updatedQuery = `update
                                todo
                            set 
                                category='${category}'
                            where
                                id=${todoId.todoId}`;
      await db.run(updatedQuery);
      response.send("Category Updated");
      break;

    case dueDate !== undefined:
      updatedQuery = `update
                                todo
                            set 
                                due_date='${dueDate}'
                            where
                                id=${todoId.todoId}`;
      await db.run(updatedQuery);
      response.send("Due Date Updated");
      break;

    default:
      break;
  }
});

// API 6

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const query = `delete from todo where id=${todoId}`;
  await db.run(query);
  response.send("Todo Deleted");
});

module.exports = app;
