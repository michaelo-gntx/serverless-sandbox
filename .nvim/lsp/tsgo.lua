--[[
tsgo (https://github.com/microsoft/typescript-go)
--]]

---@type vim.lsp.Config
return {
	settings = {
		typescript = {
			inlayHints = {
				functionLikeReturnTypes = { enabled = false },
				parameterTypes = { enabled = false },
				variableTypes = { enabled = false },
			},
		},
	},
}
